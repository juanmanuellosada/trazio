"use client";

import { useTodayEvents } from "@/lib/calendar/use-today-events";

/**
 * Precarga el caché de `useTodayEvents` (mismo `queryKey` que usa
 * `useHoyEvents` en Hoy) apenas se monta el layout privado, no recién al
 * entrar a Hoy — decisión del dueño tras ver en el navegador que las tareas
 * se pintaban primero y los eventos entraban después, empujando las filas
 * 250-300px. Vive acá, junto a `AllSectionsSeed`, y no en cada página: el
 * layout no se remonta al navegar entre pantallas de `app/(app)/`, así que
 * la consulta a Google sale una vez por carga, no una vez por clic.
 *
 * No renderiza nada ni bloquea nada: es un `useQuery` normal en un
 * componente que no devuelve nada, así que ninguna otra pantalla espera
 * esta consulta ni comparte su estado de carga con ella (mismo desacople
 * que exige `hoy-view.tsx` entre tareas y eventos). Sin Google conectado, la
 * ruta resuelve `not_connected` con 200 y sin llamar a Google (`getEventsForRange`
 * en `lib/calendar/events.ts` corta antes por falta de conexión), así que no
 * agrega ruido ni costo real para quien no lo tiene conectado.
 */
export function HoyEventsSeed({ todayDate, timezone }: { todayDate: string; timezone: string }) {
  useTodayEvents(todayDate, timezone);
  return null;
}
