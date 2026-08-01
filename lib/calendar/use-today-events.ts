"use client";

import { useQuery } from "@tanstack/react-query";
import { DAY_MINUTES, instantFromDayMinutes } from "./drag";
import type { EventsResult } from "./events";

/**
 * Eventos de un día completo, para el bloque de eventos de hoy en la vista
 * Hoy (bloque 7.8, spec `vistas-lista` "Vista Hoy"). El rango sale de
 * `instantFromDayMinutes` (tarea 6.1): medianoche a medianoche del día
 * siguiente en `timezone`, mismo cálculo que ya usa el arrastre para ubicar
 * un instante dentro de un día calendario.
 */
async function fetchEventsForRange(startISO: string, endISO: string): Promise<EventsResult> {
  const params = new URLSearchParams({ timeMin: startISO, timeMax: endISO });
  const response = await fetch(`/api/calendar/events?${params.toString()}`);
  if (!response.ok) throw new Error("No se pudieron cargar los eventos de hoy.");
  return response.json();
}

export function useTodayEvents(todayDate: string, timezone: string) {
  const startISO = instantFromDayMinutes(todayDate, 0, timezone).toISOString();
  const endISO = instantFromDayMinutes(todayDate, DAY_MINUTES, timezone).toISOString();

  return useQuery({
    queryKey: ["calendar-events", "today", todayDate, timezone] as const,
    queryFn: () => fetchEventsForRange(startISO, endISO),
  });
}
