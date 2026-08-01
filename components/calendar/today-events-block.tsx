"use client";

import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useTodayEvents } from "@/lib/calendar/use-today-events";

/**
 * Bloque de eventos de hoy en la vista Hoy (bloque 7.8, spec `vistas-lista`
 * "Vista Hoy"): después de hábitos, antes de completadas. Degrada con
 * claridad cuando la API de Google falla (tarea 3.7, riesgo de
 * `design.md`): sin conexión no muestra nada (no hay error que avisar, es
 * un estado normal), con la conexión rota o Google caído avisa en vez de
 * fallar en silencio o quedarse cargando para siempre.
 */
export function TodayEventsBlock({ todayDate, timezone }: { todayDate: string; timezone: string }) {
  const { data, isPending, isError } = useTodayEvents(todayDate, timezone);

  // `isPending`/`isError` de red (offline, D1, o el fetch mismo falló):
  // nada que mostrar, ni tareas ni hábitos avisan en este caso puntual.
  if (isPending || isError) return null;

  if (data.status === "not_connected") return null;

  if (data.status === "unavailable") {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Eventos de hoy</h2>
        <p className="text-sm text-text-secondary">
          {data.reason === "needs_reauth"
            ? "No pudimos cargar tus eventos de hoy porque la conexión con Google necesita reconectarse."
            : "No pudimos cargar tus eventos de hoy porque Google no respondió. Volvé a intentar en un momento."}
        </p>
      </section>
    );
  }

  if (data.events.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Eventos de hoy</h2>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {data.events.map((event) => (
          <li key={event.id} className="flex items-center gap-2.5 px-3 py-2.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: event.calendarColor ?? "var(--text-secondary)" }}
            />
            <span className="w-14 shrink-0 text-xs text-text-secondary">
              {event.allDay ? "Todo el día" : formatInTimeZone(parseISO(event.start), timezone, "HH:mm")}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{event.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
