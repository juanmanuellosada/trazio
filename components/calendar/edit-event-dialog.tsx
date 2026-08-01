"use client";

import { useId, useState, type FormEvent } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import { useUpdateEvent } from "@/lib/calendar/use-update-event";
import type { CalendarEventInstance, EventInput, RecurrenceEditScope } from "@/lib/calendar/events";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

/** `yyyy-MM-ddTHH:mm`, el valor que espera `<input type="datetime-local">` — interpretado en la zona horaria del navegador, mismo criterio ya usado por `components/reminders/reminder-picker.tsx`. */
function toDatetimeLocalValue(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
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
                <Input id={`${titleId}-start`} type="date" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${titleId}-start`}>Empieza</Label>
                  <Input
                    id={`${titleId}-start`}
                    type="datetime-local"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${titleId}-end`}>Termina</Label>
                  <Input id={`${titleId}-end`} type="datetime-local" value={endInput} onChange={(e) => setEndInput(e.target.value)} />
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
