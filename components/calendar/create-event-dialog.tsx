"use client";

import { useId, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarAdminError, useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import { useCreateEvent } from "@/lib/calendar/use-create-event";
import type { EventInput } from "@/lib/calendar/events";

/** Mensaje de tres partes (`.claude/rules/copy.md`) para cuando no hay ningún calendario disponible: sin esto, el formulario queda con "Crear evento" deshabilitado para siempre y sin explicar por qué. */
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
 * Alta de evento (tarea 6.7/6.8): el camino que sigue a elegir "Evento" en
 * `CreateBlockChoiceDialog`, y el mismo que respalda el futuro "botón de
 * nuevo evento" del grupo 7 (tarea 7.6, D-G) — sin ese botón todavía, esta
 * es la única puerta de alta de eventos que existe en la interfaz, así que
 * tiene que funcionar de punta a punta ya. Horario fijo (el rango elegido
 * en la grilla): solo pide título y calendario, como el alta rápida de
 * tareas. Descripción y ubicación se agregan después, no en el alta
 * (non-goal de `design.md`: "se editan los campos básicos de un evento").
 */
export function CreateEventDialog({
  open,
  onOpenChange,
  start,
  end,
  timezone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: Date;
  end: Date;
  timezone: string;
}) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useGoogleCalendars();
  const createEvent = useCreateEvent();

  const calendars = data?.calendars ?? [];
  const effectiveCalendarId = calendarId ?? calendars.find((c) => c.primary)?.id ?? calendars[0]?.id ?? null;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTitle("");
      setCalendarId(null);
    }
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !effectiveCalendarId) return;
    const input: EventInput = {
      calendarId: effectiveCalendarId,
      title: title.trim(),
      description: null,
      location: null,
      allDay: false,
      start: start.toISOString(),
      end: end.toISOString(),
      timeZone: timezone,
    };
    createEvent.mutate(input, { onSuccess: () => handleOpenChange(false) });
  }

  const rangeLabel = `${format(start, "EEEE d 'de' MMMM, HH:mm", { locale: es })}–${format(end, "HH:mm", { locale: es })}`;

  // Sin esto, un usuario sin Google conectado (o sin ningún calendario
  // habilitado) veía el formulario completo con "Crear evento"
  // deshabilitado para siempre, sin ninguna pista de por qué — un callejón
  // sin salida silencioso, justo lo que `.claude/rules/copy.md` pide evitar.
  const unavailable = !isLoading && (isError || calendars.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Evento nuevo</DialogTitle>
          <DialogDescription>{rangeLabel}</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando tus calendarios…</p>}

        {unavailable && (
          <p className="text-sm text-muted-foreground">
            {isError
              ? unavailableMessage(error)
              : "No pudimos crear el evento porque no tenés ninguna cuenta de Google conectada, o no tenés ningún calendario habilitado. Revisá la conexión desde Configuración y volvé a intentar."}
          </p>
        )}

        {!isLoading && !unavailable && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={titleId}>Título</Label>
              <Input
                id={titleId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
                placeholder="Ej: Reunión con el equipo"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Calendario</Label>
              <Select value={effectiveCalendarId ?? undefined} onValueChange={(next) => next && setCalendarId(next)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{calendars.find((c) => c.id === effectiveCalendarId)?.summary}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={!title.trim() || !effectiveCalendarId || createEvent.isPending}>
                Crear evento
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
