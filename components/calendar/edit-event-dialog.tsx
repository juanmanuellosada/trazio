"use client";

import { useId, useState, type FormEvent } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { DatePickerBody } from "@/components/selectors/date-picker-body";
import { TimeField, type TimeValue } from "@/components/selectors/time-field";
import type { ParserContext } from "@/lib/parser/types";
import { useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import { useUpdateEvent } from "@/lib/calendar/use-update-event";
import type { CalendarEventInstance, EventInput, RecurrenceEditScope } from "@/lib/calendar/events";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

/**
 * `yyyy-MM-ddTHH:mm`: formato interno de `startInput`/`endInput`,
 * interpretado en la zona horaria del navegador. Ya no es lo que espera un
 * `<input type="datetime-local">` (`sin-controles-nativos` se lo sacó a
 * este diálogo) — sigue siendo la representación que `buildChanges` arma
 * con `new Date(...)`, y `splitDateTimeLocal`/`joinDateTimeLocal` la parten
 * y recomponen para `DateField`/`TimeField`.
 */
function toDatetimeLocalValue(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
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
 * Selector de una fecha sola (`sin-controles-nativos`, tarea 2.3): botón que
 * abre el mismo cuerpo compartido del selector de fecha (`DatePickerBody`,
 * calendario propio + lenguaje natural), en vez de un `<input type="date">`
 * o `type="datetime-local">`. Componente local a este diálogo — no hay
 * lógica de hora ni de formato acá para duplicar, solo compone
 * `DatePickerBody` con el día que corresponda de `startInput`/`endInput`.
 */
function DateField({
  id,
  ariaLabel,
  value,
  ctx,
  onChange,
}: {
  id: string;
  ariaLabel: string;
  /** `yyyy-MM-dd`. */
  value: string;
  ctx: Omit<ParserContext, "ahora">;
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
        {format(parseISO(value), "d 'de' MMMM 'de' yyyy", { locale: es })}
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

/**
 * Segundo camino para editar el horario de un evento existente, sin
 * arrastrar (D24, tarea 7.11/8.4/8.9): hasta esta tanda, mover o
 * redimensionar arrastrando era la única forma de tocar el horario de un
 * evento, y ni siquiera esa mutaba todavía (solo avisaba con un toast).
 * Separado de `CreateEventDialog` en vez de agregarle un modo edición: ese
 * componente recibe un rango ya elegido y de solo lectura (el que se acaba
 * de arrastrar); acá el horario es del propio evento y se edita, con dos
 * formas de input distintas según `allDay` (datetime-local con hora, o una
 * sola fecha conservando la duración en días) — suficiente distinto como
 * para no justificar una rama condicional dentro del mismo formulario.
 *
 * Recurrencia (tarea 3.6): si el evento pertenece a una serie, confirmar el
 * formulario abre `RecurrenceScopeDialog` antes de mutar nada — mismo
 * criterio que el arrastre en `screen-calendar.tsx`, sin default silencioso.
 */
export function EditEventDialog({
  open,
  onOpenChange,
  event,
  timezone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventInstance;
  timezone: string;
}) {
  const titleId = useId();
  const [title, setTitle] = useState(event.title);
  const [calendarId, setCalendarId] = useState(event.calendarId);
  const [startInput, setStartInput] = useState(() => (event.allDay ? event.start : toDatetimeLocalValue(event.start)));
  const [endInput, setEndInput] = useState(() => (event.allDay ? event.start : toDatetimeLocalValue(event.end)));
  const [pendingChanges, setPendingChanges] = useState<EventInput | null>(null);

  const { data, isLoading } = useGoogleCalendars();
  const updateEvent = useUpdateEvent();
  const calendars = data?.calendars ?? [];

  // Componentes propios de fecha y hora (`sin-controles-nativos`, tarea
  // 2.3): `DateField`/`TimeField` reemplazan los tres `<input>` nativos que
  // tenía este diálogo, sin cambiar qué guarda `startInput`/`endInput` —
  // siguen siendo las mismas cadenas que `buildChanges` ya interpretaba.
  const { timeFormat, weekStartsOn } = useUserPreferences();
  const ctx: Omit<ParserContext, "ahora"> = {
    zonaHoraria: timezone,
    semanaEmpiezaEn: weekStartsOn,
    proyectos: [],
    etiquetas: [],
  };
  const startParts = event.allDay ? null : splitDateTimeLocal(startInput);
  const endParts = event.allDay ? null : splitDateTimeLocal(endInput);

  // Todo el día: la cantidad de días que ya cubría el evento se conserva —
  // solo se mueve el día de inicio, no se editan los dos extremos por
  // separado (el `end` de Google es exclusivo, día siguiente al último).
  const allDaySpanDays = event.allDay ? Math.max(1, differenceInCalendarDays(parseISO(event.end), parseISO(event.start))) : 1;

  function handleOpenChange(next: boolean) {
    if (!next) setPendingChanges(null);
    onOpenChange(next);
  }

  function buildChanges(): EventInput {
    if (event.allDay) {
      return {
        calendarId,
        title: title.trim(),
        description: event.description,
        location: event.location,
        allDay: true,
        start: startInput,
        end: format(addDays(parseISO(startInput), allDaySpanDays), "yyyy-MM-dd"),
        timeZone: timezone,
      };
    }
    return {
      calendarId,
      title: title.trim(),
      description: event.description,
      location: event.location,
      allDay: false,
      start: new Date(startInput).toISOString(),
      end: new Date(endInput).toISOString(),
      timeZone: event.timeZone ?? timezone,
    };
  }

  function submitChanges(changes: EventInput, scope?: RecurrenceEditScope) {
    updateEvent.mutate(
      {
        target: {
          calendarId: event.calendarId,
          eventId: event.id,
          recurringEventId: event.recurringEventId,
          originalStartTime: event.originalStartTime,
        },
        changes,
        scope,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!title.trim() || !calendarId) return;
    const changes = buildChanges();
    if (event.recurringEventId !== null) {
      setPendingChanges(changes);
      return;
    }
    submitChanges(changes);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar evento</DialogTitle>
            <DialogDescription>Cambiá el título, el calendario o el horario.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={titleId}>Título</Label>
              <Input id={titleId} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>Calendario</Label>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando calendarios…</p>
              ) : calendars.length > 0 ? (
                <Select value={calendarId} onValueChange={(next) => next && setCalendarId(next)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{calendars.find((c) => c.id === calendarId)?.summary}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pudimos cargar la lista de calendarios: el evento se guarda en el mismo calendario que ya tenía. Volvé a
                  intentar más tarde si querés cambiarlo.
                </p>
              )}
            </div>

            {event.allDay ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${titleId}-start`}>Fecha</Label>
                <DateField id={`${titleId}-start`} ariaLabel="Fecha" value={startInput} ctx={ctx} onChange={setStartInput} />
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
                      onChange={(date) => setStartInput(joinDateTimeLocal(date, startParts!.time))}
                    />
                    <TimeField
                      id={`${titleId}-start-time`}
                      label="Hora"
                      value={startParts!.time}
                      onChange={(time) => setStartInput(joinDateTimeLocal(startParts!.date, time))}
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
                      onChange={(date) => setEndInput(joinDateTimeLocal(date, endParts!.time))}
                    />
                    <TimeField
                      id={`${titleId}-end-time`}
                      label="Hora"
                      value={endParts!.time}
                      onChange={(time) => setEndInput(joinDateTimeLocal(endParts!.date, time))}
                      timeFormat={timeFormat}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={!title.trim() || !calendarId || updateEvent.isPending}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {pendingChanges && (
        <RecurrenceScopeDialog
          open
          onOpenChange={(next) => !next && setPendingChanges(null)}
          action="editar"
          onConfirm={(scope) => {
            submitChanges(pendingChanges, scope);
            setPendingChanges(null);
          }}
        />
      )}
    </>
  );
}
