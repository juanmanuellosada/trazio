"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { createClient } from "@/lib/supabase/client";
import {
  onCommentsRealtimeEvent,
  onFiltersRealtimeEvent,
  onProjectsRealtimeEvent,
  onRemindersRealtimeEvent,
  onSectionsRealtimeEvent,
  onTasksRealtimeEvent,
} from "./handlers";

export type RealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

/**
 * Las tablas con suscripción: las tres de fase 1 (spec
 * `sincronizacion-tiempo-real` y `docs/data-model.md` sección Realtime) más
 * `comments`, `reminders` y `filters` de fase 2. `labels`, `task_labels` y
 * el resto tienen replicación habilitada en la base para fases
 * posteriores, pero todavía no las suscribe ningún cliente.
 */
const REALTIME_TABLES = [
  { table: "tasks", onEvent: onTasksRealtimeEvent },
  { table: "projects", onEvent: onProjectsRealtimeEvent },
  { table: "sections", onEvent: onSectionsRealtimeEvent },
  { table: "comments", onEvent: onCommentsRealtimeEvent },
  { table: "reminders", onEvent: onRemindersRealtimeEvent },
  { table: "filters", onEvent: onFiltersRealtimeEvent },
] as const;

/**
 * 10.1/10.2: un canal por tabla, filtrado por `user_id` de la sesión activa.
 * Al recibir cualquier evento (`*`: insert/update/delete) invoca el
 * manejador de esa tabla (regla D3, `./handlers.ts`), que decide si
 * invalida ahora o deja que lo haga el `onSettled` de una mutación en
 * vuelo.
 *
 * Devuelve la función de limpieza: el llamador (`RealtimeProvider`) la
 * ejecuta en el cleanup de su `useEffect`, al desmontar o cerrar sesión,
 * para no dejar canales colgados.
 */
export function subscribeToRealtime(
  supabase: ReturnType<typeof createClient>,
  queryClient: QueryClient,
  userId: string,
  onStatusChange: (table: string, status: RealtimeStatus) => void,
): () => void {
  const channels = REALTIME_TABLES.map(({ table, onEvent }) =>
    supabase
      .channel(`realtime:${table}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        () => onEvent(queryClient),
      )
      .subscribe((status) => onStatusChange(table, status as RealtimeStatus)),
  );

  return () => {
    channels.forEach((channel) => supabase.removeChannel(channel));
  };
}
