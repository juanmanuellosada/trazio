"use client";

import { useId, useState, type FormEvent } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { AppDialog } from "@/components/primitives/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { DatePickerBody } from "@/components/selectors/date-picker-body";
import { TimeField, DEFAULT_TIME, type TimeValue } from "@/components/selectors/time-field";
import { EventRecurrenceField } from "@/components/calendar/event-recurrence-field";
import type { ParserContext } from "@/lib/parser/types";
import { CalendarAdminError, canWriteCalendar, useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import type { EventRecurrenceValue } from "@/lib/calendar/event-recurrence";
import type { DateFormatPreference } from "@/lib/dates/format";

/** Mensaje de tres partes (`.claude/rules/copy.md`) para cuando no hay ningún calendario disponible. */
function unavailableMessage(error: unknown): string {
  if (error instanceof CalendarAdminError && error.code === "not_connected") {
    return "No pudimos cargar tus calendarios porque no hay ninguna cuenta de Google conectada. Conectala desde Configuración y volvé a intentar.";
  }
  if (error instanceof CalendarAdminError && error.code === "needs_reauth") {
    return "No pudimos cargar tus calendarios porque la conexión con Google necesita reconectarse. Reconectala desde Configuración y volvé a intentar.";
  }
  return "No pudimos cargar tus calendarios porque Google no respondió. Volvé a intentar en un momento.";
}

/**
 * `yyyy-MM-ddTHH:mm`, interpretado en la zona horaria del navegador (mismo
 * criterio que tenía `edit-event-dialog.tsx` antes de esta tanda).
 */
function toDatetimeLocalValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function splitDateTimeLocal(value: string): { date: string; time: TimeValue } {
  const [date, time] = value.split("T");
  const [hour, minute] = time.split(":").map(Number);
  return { date, time: { hour, minute } };
}

function joinDateTimeLocal(date: string, time: TimeValue): string {
  return `${date}T${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

/**
 * Selector de una fecha sola (`sin-controles-nativos`): botón que abre el
 * cuerpo compartido del selector de fecha (`DatePickerBody`), en vez de un
 * `<input type="date">`. Local a este diálogo: no hay lógica de hora ni de
 * formato acá para duplicar.
 */
function DateField({
  id,
  ariaLabel,
  value,
  ctx,
  dateFormat,
  onChange,
}: {
  id: string;
  ariaLabel: string;
  /** `yyyy-MM-dd`. */
  value: string;
  ctx: Omit<ParserContext, "ahora">;
  /**
   * Formato numérico corto, según la preferencia del usuario
   * (`dd-MM-yyyy`/`yyyy-MM-dd`, `lib/dates/format.ts`): "2 de agosto de
   * 2026" no entraba en una sola línea junto a la hora al lado.
   */
  dateFormat: DateFormatPreference;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        className="flex h-9 w-full items-center gap-1.5 rounded-lg border border-input px-2.5 text-left text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CalendarDays className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
        {format(parseISO(value), dateFormat)}
      </PopoverTrigger>
      <PopoverContent align="start">
        <DatePickerBody
          inputId={`${id}-input`}
          inputLabel="Escribí la fecha"
          placeholder="Ej: mañana, el martes, en 3 días…"
          ctx={ctx}
          selectedDate={value}
          onCommitText={(result) => {
            if (result.dueDate) {
              onChange(result.dueDate);
              setOpen(false);
            }
          }}
          onSelectDate={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export type EventFormValues = {
  title: string;
  calendarId: string;
  allDay: boolean;
  /** Instante de inicio (o fecha, si `allDay`). */
  start: Date;
  /** Instante de fin (o fecha de fin exclusiva, si `allDay`). */
  end: Date;
  description: string | null;
  location: string | null;
  recurrence: EventRecurrenceValue;
};

export type EventFormInitialValues = {
  title: string;
  /** `null` cuando todavía no hay ningún calendario elegido (alta sin calendarios cargados). */
  calendarId: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  description: string | null;
  location: string | null;
  recurrence: EventRecurrenceValue;
};

/**
 * Formulario de evento compartido entre crear y editar
 * (`alta-de-evento-completa`, D-A): título, calendario, fecha, hora de
 * inicio y de fin, todo el día, repetición, descripción y ubicación — los
 * mismos campos en los dos modos, sin que crear ofrezca menos que editar.
 * Lo que difiere entre los dos modos vive en quien lo monta
 * (`create-event-dialog.tsx`/`edit-event-dialog.tsx`): el alcance de series
 * al editar, y qué tan bloqueante es no tener ningún calendario disponible
 * (`blockWhenNoCalendars` — al crear, sin calendario no hay dónde guardar el
 * evento nuevo; al editar, el evento ya tiene uno, así que una falla de
 * Google al listar calendarios no debe bloquear el resto de los cambios).
 */
export function EventFormDialog({
  open,
  onOpenChange,
  dialogTitle,
  dialogDescription,
  submitLabel,
  initial,
  blockWhenNoCalendars,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogTitle: string;
  /**
   * Función en vez de texto fijo para el alta (`create-event-dialog.tsx`):
   * el resumen tiene fecha y hora, que cambian con "todo el día" y con los
   * campos de fecha/hora del formulario — un texto fijo calculado una sola
   * vez a partir del rango propuesto (como estaba antes) quedaba mostrando
   * un horario después de activar "todo el día".
   */
  dialogDescription?: string | ((current: { allDay: boolean; start: Date; end: Date }) => string);
  submitLabel: string;
  initial: EventFormInitialValues;
  blockWhenNoCalendars: boolean;
  isSubmitting: boolean;
  onSubmit: (values: EventFormValues) => void;
}) {
  const titleId = useId();
  const { timezone, timeFormat, weekStartsOn, dateFormat } = useUserPreferences();
  const { data, isLoading: calendarsLoading, isError, error } = useGoogleCalendars();
  const calendars = data?.calendars ?? [];

  const [title, setTitle] = useState(initial.title);
  const [calendarId, setCalendarId] = useState(initial.calendarId);
  const [allDay, setAllDay] = useState(initial.allDay);
  const [description, setDescription] = useState(initial.description ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [recurrence, setRecurrence] = useState<EventRecurrenceValue>(initial.recurrence);

  // Representación con hora, siempre presente aunque `allDay` esté activo
  // (para no perderla si se prueba el interruptor y se vuelve atrás):
  // arranca en el horario propuesto, o en 9:00–10:00 si el evento entró
  // como todo el día.
  const [timedStart, setTimedStart] = useState(() =>
    toDatetimeLocalValue(initial.allDay ? new Date(initial.start.getFullYear(), initial.start.getMonth(), initial.start.getDate(), DEFAULT_TIME.hour, DEFAULT_TIME.minute) : initial.start),
  );
  const [timedEnd, setTimedEnd] = useState(() =>
    toDatetimeLocalValue(
      initial.allDay
        ? new Date(initial.start.getFullYear(), initial.start.getMonth(), initial.start.getDate(), DEFAULT_TIME.hour + 1, DEFAULT_TIME.minute)
        : initial.end,
    ),
  );
  // Representación de todo el día: una fecha de inicio editable, con la
  // cantidad de días que ya cubría el evento conservada (el `end` de Google
  // es exclusivo, día siguiente al último) — sin picker de rango, mismo
  // alcance que ya tenía `EditEventDialog`.
  const [allDayDate, setAllDayDate] = useState(() => format(initial.start, "yyyy-MM-dd"));
  const [allDaySpanDays] = useState(() => (initial.allDay ? Math.max(1, differenceInCalendarDays(initial.end, initial.start)) : 1));

  const ctx: Omit<ParserContext, "ahora"> = {
    zonaHoraria: timezone,
    semanaEmpiezaEn: weekStartsOn,
    proyectos: [],
    etiquetas: [],
  };

  // Solo se ofrecen como destino los calendarios donde se puede escribir:
  // crear o editar un evento en uno de solo lectura ("reader"/
  // "freeBusyReader") Google lo rechaza. El calendario ya elegido
  // (`calendarId`) se conserva en la lista aunque no sea escribible —
  // pasa al editar un evento que ya vive en uno compartido de solo
  // lectura: sacarlo de las opciones dejaría el selector vacío en vez de
  // mostrar dónde está guardado.
  const writableCalendars = calendars.filter(canWriteCalendar);
  const pinnedCalendar = calendarId ? calendars.find((c) => c.id === calendarId) : undefined;
  const selectableCalendars =
    pinnedCalendar && !writableCalendars.some((c) => c.id === pinnedCalendar.id)
      ? [pinnedCalendar, ...writableCalendars]
      : writableCalendars;

  const effectiveCalendarId = calendarId ?? writableCalendars.find((c) => c.primary)?.id ?? writableCalendars[0]?.id ?? null;
  const unavailableCalendars = !calendarsLoading && (isError || calendars.length === 0);
  const noWritableCalendars = !calendarsLoading && !isError && calendars.length > 0 && writableCalendars.length === 0;

  const startParts = allDay ? null : splitDateTimeLocal(timedStart);
  const endParts = allDay ? null : splitDateTimeLocal(timedEnd);
  const endBeforeStart = !allDay && new Date(timedEnd).getTime() <= new Date(timedStart).getTime();
  // Rango vigente en cualquiera de los dos modos, para no repetirlo entre el
  // resumen del encabezado (`resolvedDescription`) y `handleSubmit`.
  const currentRange = allDay
    ? { start: parseISO(allDayDate), end: addDays(parseISO(allDayDate), allDaySpanDays) }
    : { start: new Date(timedStart), end: new Date(timedEnd) };
  const recurrenceDate = currentRange.start;

  const resolvedDescription = typeof dialogDescription === "function" ? dialogDescription({ allDay, ...currentRange }) : dialogDescription;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  // Sincroniza la fecha (y, al volver a horario, la hora) entre las dos
  // representaciones al cruzar el interruptor: sin esto, cambiar la fecha
  // en un modo y después cruzar al otro dejaba la fecha vieja del montaje
  // en vez de la recién elegida (`timedStart`/`timedEnd`/`allDayDate` viven
  // como estados independientes, ver el comentario de más arriba).
  function handleAllDayChange(next: boolean) {
    if (next) {
      setAllDayDate(splitDateTimeLocal(timedStart).date);
    } else {
      const { time: startTime } = splitDateTimeLocal(timedStart);
      const { time: endTime } = splitDateTimeLocal(timedEnd);
      setTimedStart(joinDateTimeLocal(allDayDate, startTime));
      setTimedEnd(joinDateTimeLocal(allDayDate, endTime));
    }
    setAllDay(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !effectiveCalendarId || endBeforeStart) return;

    onSubmit({
      title: title.trim(),
      calendarId: effectiveCalendarId,
      allDay,
      start: currentRange.start,
      end: currentRange.end,
      description: description.trim() || null,
      location: location.trim() || null,
      recurrence,
    });
  }

  const blockForm = blockWhenNoCalendars && (unavailableCalendars || noWritableCalendars);
  const submitDisabled = !title.trim() || !effectiveCalendarId || endBeforeStart || isSubmitting || blockForm;

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={dialogTitle}
      description={resolvedDescription}
      size="lg"
      className="max-h-[85vh] overflow-y-auto"
    >
      {calendarsLoading && <p className="text-sm text-muted-foreground">Cargando tus calendarios…</p>}

      {blockForm && (
        <p className="text-sm text-muted-foreground">
          {isError
            ? unavailableMessage(error)
            : noWritableCalendars
              ? "No pudimos crear el evento porque no tenés ningún calendario donde puedas escribir: los que tenés habilitados son todos de solo lectura. Habilitá uno donde tengas permiso de edición desde Configuración, o pedile ese permiso a quien lo comparte, y volvé a intentar."
              : "No pudimos crear el evento porque no tenés ninguna cuenta de Google conectada, o no tenés ningún calendario habilitado. Revisá la conexión desde Configuración y volvé a intentar."}
        </p>
      )}

      {!calendarsLoading && !blockForm && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={titleId}>Título</Label>
            <Input id={titleId} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Ej: Reunión con el equipo" />
          </div>

          <div className="space-y-1.5">
            <Label>Calendario</Label>
            {unavailableCalendars ? (
              <p className="text-sm text-muted-foreground">
                No pudimos cargar la lista de calendarios: el evento se guarda en el calendario que ya tenía. Volvé a intentar
                más tarde si querés cambiarlo.
              </p>
            ) : (
              <Select value={effectiveCalendarId ?? undefined} onValueChange={(next) => next && setCalendarId(next)}>
                <SelectTrigger aria-label="Calendario" className="w-full">
                  <SelectValue>{selectableCalendars.find((c) => c.id === effectiveCalendarId)?.summary}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectableCalendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${titleId}-all-day`}>Todo el día</Label>
            <Switch id={`${titleId}-all-day`} checked={allDay} onCheckedChange={handleAllDayChange} />
          </div>

          {allDay ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-start`}>Fecha</Label>
              <DateField
                id={`${titleId}-start`}
                ariaLabel="Fecha"
                value={allDayDate}
                ctx={ctx}
                dateFormat={dateFormat}
                onChange={setAllDayDate}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Empieza</span>
                <div className="grid grid-cols-2 gap-2">
                  <DateField
                    id={`${titleId}-start-date`}
                    ariaLabel="Fecha en que empieza"
                    value={startParts!.date}
                    ctx={ctx}
                    dateFormat={dateFormat}
                    onChange={(date) => setTimedStart(joinDateTimeLocal(date, startParts!.time))}
                  />
                  <TimeField
                    id={`${titleId}-start-time`}
                    label="Hora"
                    value={startParts!.time}
                    onChange={(time) => setTimedStart(joinDateTimeLocal(startParts!.date, time))}
                    timeFormat={timeFormat}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Termina</span>
                <div className="grid grid-cols-2 gap-2">
                  <DateField
                    id={`${titleId}-end-date`}
                    ariaLabel="Fecha en que termina"
                    value={endParts!.date}
                    ctx={ctx}
                    dateFormat={dateFormat}
                    onChange={(date) => setTimedEnd(joinDateTimeLocal(date, endParts!.time))}
                  />
                  <TimeField
                    id={`${titleId}-end-time`}
                    label="Hora"
                    value={endParts!.time}
                    onChange={(time) => setTimedEnd(joinDateTimeLocal(endParts!.date, time))}
                    timeFormat={timeFormat}
                  />
                </div>
              </div>
              {endBeforeStart && <p className="text-xs text-error">La hora de fin tiene que ser después del inicio.</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Repetición</Label>
            <EventRecurrenceField value={recurrence} onChange={setRecurrence} date={recurrenceDate} weekStartsOn={weekStartsOn} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${titleId}-description`}>Descripción</Label>
            <Textarea id={`${titleId}-description`} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${titleId}-location`}>Ubicación</Label>
            <Input
              id={`${titleId}-location`}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ej: Oficina, o un link de videollamada"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      )}
    </AppDialog>
  );
}
