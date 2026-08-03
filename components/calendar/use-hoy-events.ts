"use client";

import { useMemo } from "react";
import { canWriteCalendar, useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import { useTodayEvents } from "@/lib/calendar/use-today-events";
import type { CalendarEventInstance } from "@/lib/calendar/events";

/**
 * Puente entre Hoy (`components/tasks/hoy-view.tsx`) y el dominio de
 * calendario, para la capacidad `hoy-con-eventos`. `components/tasks/`
 * tiene prohibido importar de `lib/calendar/` directo
 * (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts` lo
 * verifica escaneando esa carpeta): este archivo, que vive en
 * `components/calendar/`, es el único lugar que junta los eventos de hoy
 * con la lista de calendarios (para el nombre a mostrar y para cruzar el
 * permiso de escritura, D-D) y expone el resultado ya resuelto — Hoy nunca
 * ve un tipo ni una llamada de `lib/calendar/`.
 *
 * `isPending`/`isError` de la consulta de eventos se tratan igual que "sin
 * conectar" (mismo criterio que tenía `today-events-block.tsx`, al que este
 * hook reemplaza): sin conexión o mientras carga, Hoy no muestra huecos ni
 * avisos (D-E); un fallo de Google real llega como `data.status ===
 * "unavailable"` con la ruta siempre respondiendo 200 (`app/api/calendar/events/route.ts`),
 * y ese es el único caso que produce el aviso al pie.
 */

export type HoyEventsResult =
  | { status: "loading" }
  | { status: "not_connected" }
  | { status: "unavailable"; reason: "transient" | "needs_reauth" }
  | {
      status: "ok";
      events: CalendarEventInstance[];
      calendarName: (calendarId: string) => string;
      /** Cruza el calendario del evento contra la lista de calendarios (D-D): el permiso vive ahí, no en el evento. Conservador mientras la lista de calendarios todavía no cargó: `false`. */
      canEdit: (event: CalendarEventInstance) => boolean;
    };

export function useHoyEvents(todayDate: string, timezone: string): HoyEventsResult {
  const eventsQuery = useTodayEvents(todayDate, timezone);
  const calendars = useGoogleCalendars().data?.calendars;

  return useMemo((): HoyEventsResult => {
    if (eventsQuery.isPending || eventsQuery.isError) return { status: "loading" };
    if (eventsQuery.data.status === "not_connected") return { status: "not_connected" };
    if (eventsQuery.data.status === "unavailable") return { status: "unavailable", reason: eventsQuery.data.reason };

    const calendarById = new Map((calendars ?? []).map((calendar) => [calendar.id, calendar] as const));
    return {
      status: "ok",
      events: eventsQuery.data.events,
      calendarName: (calendarId) => calendarById.get(calendarId)?.summary ?? "Calendario",
      canEdit: (event) => {
        const calendar = calendarById.get(event.calendarId);
        return calendar ? canWriteCalendar(calendar) : false;
      },
    };
  }, [eventsQuery.isPending, eventsQuery.isError, eventsQuery.data, calendars]);
}
