"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { dataWindowChunks, isoWeekEnd } from "@/lib/dates/data-window";
import { DAY_MINUTES, instantFromDayMinutes } from "./drag";
import type { CalendarEventInstance, EventsResult } from "./events";

/**
 * Eventos de todo un rango de días visibles del calendario (grupo 7, "montar
 * `CalendarView`"; pasado a trozos de semana ISO en la tarea 5.1,
 * `design.md` decisión 4): un pedido por cada semana ISO que cubre lo
 * visible más el margen de `dataWindowChunks` en vez de un único pedido por
 * el rango visible exacto — así, correrse un día reutiliza los trozos que
 * ya estaban en caché de TanStack Query (`queryKey` por trozo) y a lo sumo
 * agrega uno nuevo, en lugar de volver a pedir todo el rango bajo una
 * `queryKey` que cambia con cada día que se corre.
 */
async function fetchEventsForRange(startISO: string, endISO: string): Promise<EventsResult> {
  const params = new URLSearchParams({ timeMin: startISO, timeMax: endISO });
  const response = await fetch(`/api/calendar/events?${params.toString()}`);
  if (!response.ok) throw new Error("No se pudieron cargar los eventos del calendario.");
  return response.json();
}

/** Un evento puede volver en dos trozos vecinos si su horario cae cerca del límite entre semanas: se identifica por calendario + id, igual que `eventBlockId` en `screen-blocks.ts`. */
function dedupeEvents(events: CalendarEventInstance[]): CalendarEventInstance[] {
  const byKey = new Map(events.map((event) => [`${event.calendarId}:${event.id}`, event] as const));
  return [...byKey.values()];
}

/** Combina el resultado de cada trozo en un único `EventsResult` (mismo tipo que ya esperaba quien llama a este hook, `screen-calendar.tsx`): si algún trozo todavía no conectó o no está disponible, ese estado gana sobre "ok" — un rango parcialmente cargado nunca se muestra como si estuviera completo. */
function mergeChunkResults(results: (EventsResult | undefined)[]): EventsResult | undefined {
  const loaded = results.filter((result): result is EventsResult => result !== undefined);
  if (loaded.length === 0) return undefined;
  const notConnected = loaded.find((result) => result.status === "not_connected");
  if (notConnected) return notConnected;
  const unavailable = loaded.find((result) => result.status === "unavailable");
  if (unavailable) return unavailable;
  const events = loaded.flatMap((result) => (result.status === "ok" ? result.events : []));
  return { status: "ok", events: dedupeEvents(events) };
}

export function useCalendarRangeEvents(visibleDays: string[], timezone: string) {
  const chunks = dataWindowChunks(visibleDays);

  const queries = useQueries({
    queries: chunks.map((weekStart) => ({
      queryKey: ["calendar-events", "range", "chunk", weekStart] as const,
      queryFn: () =>
        fetchEventsForRange(
          instantFromDayMinutes(weekStart, 0, timezone).toISOString(),
          instantFromDayMinutes(isoWeekEnd(weekStart), DAY_MINUTES, timezone).toISOString(),
        ),
    })),
  });

  const data = useMemo(() => mergeChunkResults(queries.map((query) => query.data)), [queries]);

  return { data };
}
