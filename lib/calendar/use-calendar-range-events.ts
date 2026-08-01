"use client";

import { useQuery } from "@tanstack/react-query";
import { DAY_MINUTES, instantFromDayMinutes } from "./drag";
import type { EventsResult } from "./events";

/**
 * Eventos de todo un rango de días visibles del calendario (grupo 7, "montar
 * `CalendarView`"): mismo endpoint y mismo cálculo de límites de día que
 * `use-today-events.ts` (medianoche a medianoche en `timezone`), generalizado
 * a un rango de más de un día en vez de fijo a hoy — la caché de 60 segundos
 * (D-C) vive del lado del servidor, así que moverse entre semanas no
 * multiplica pedidos idénticos.
 */
async function fetchEventsForRange(startISO: string, endISO: string): Promise<EventsResult> {
  const params = new URLSearchParams({ timeMin: startISO, timeMax: endISO });
  const response = await fetch(`/api/calendar/events?${params.toString()}`);
  if (!response.ok) throw new Error("No se pudieron cargar los eventos del calendario.");
  return response.json();
}

export function useCalendarRangeEvents(visibleDays: string[], timezone: string) {
  const firstDay = visibleDays[0];
  const lastDay = visibleDays[visibleDays.length - 1];
  const startISO = firstDay ? instantFromDayMinutes(firstDay, 0, timezone).toISOString() : null;
  const endISO = lastDay ? instantFromDayMinutes(lastDay, DAY_MINUTES, timezone).toISOString() : null;

  return useQuery({
    queryKey: ["calendar-events", "range", startISO, endISO] as const,
    queryFn: () => fetchEventsForRange(startISO!, endISO!),
    enabled: startISO != null && endISO != null,
  });
}
