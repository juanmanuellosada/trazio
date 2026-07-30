"use client";

import type { QueryClient } from "@tanstack/react-query";
import { TASKS_MUTATION_KEY } from "@/lib/tasks/mutations";
import { PROJECTS_MUTATION_KEY } from "@/lib/projects/mutations";
import { SECTIONS_MUTATION_KEY } from "@/lib/sections/mutations";
import { COMMENTS_MUTATION_KEY } from "@/lib/comments/mutations";
import { REMINDERS_MUTATION_KEY } from "@/lib/reminders/mutations";
import { FILTERS_MUTATION_KEY } from "@/lib/filters/mutations";

/**
 * Regla D3 (`design.md`, sección D — el corazón del bloque 10): nadie había
 * definido qué pasa cuando llega un evento de Realtime mientras hay un
 * optimistic update sin resolver. Sin esta regla, invalidar en el acto
 * refetchea contra un servidor que todavía no procesó la escritura en
 * vuelo, y la interfaz parpadea: el cambio se ve, vuelve atrás y se vuelve
 * a aplicar cuando la mutación termina.
 *
 * La solución: antes de invalidar, preguntarle a `queryClient.isMutating`
 * si hay una mutación en vuelo sobre la misma entidad (`mutationKey`, ver
 * `lib/tasks/mutations.ts`, `lib/projects/mutations.ts` y
 * `lib/sections/mutations.ts`). Si la hay, no se invalida nada acá: la
 * clave queda "sucia" implícitamente porque el `onSettled` de esa mutación
 * ya invalida las mismas queries al terminar (éxito o error), así que dejar
 * pasar el evento es suficiente — nunca se muta el caché a mano
 * (`.claude/rules/frontend.md`).
 *
 * El chequeo es por entidad (`tasks`/`projects`/`sections`), no por fila
 * puntual: una mutación de tareas ya toca varias claves a la vez (lista del
 * proyecto, detalle, Hoy, Completado) y su `onSettled` las invalida todas
 * juntas. El costo de esta simplificación es diferir, en la rara ventana de
 * una mutación en vuelo, la invalidación de un evento de Realtime sobre una
 * fila no relacionada de la misma tabla — se corrige solo en el próximo
 * evento o la próxima mutación.
 */
function invalidateUnlessMutating(
  queryClient: QueryClient,
  entityQueryKey: readonly string[],
  mutationKey: readonly string[],
): void {
  if (queryClient.isMutating({ mutationKey }) > 0) return;
  queryClient.invalidateQueries({ queryKey: entityQueryKey });
}

/** 10.2: manejador de `tasks` — cubre lista por proyecto, detalle, Hoy y Completado (todas las claves empiezan con `"tasks"`). */
export function onTasksRealtimeEvent(queryClient: QueryClient): void {
  invalidateUnlessMutating(queryClient, ["tasks"], TASKS_MUTATION_KEY);
}

/** 10.2: manejador de `projects`. */
export function onProjectsRealtimeEvent(queryClient: QueryClient): void {
  invalidateUnlessMutating(queryClient, ["projects"], PROJECTS_MUTATION_KEY);
}

/** 10.2: manejador de `sections`. */
export function onSectionsRealtimeEvent(queryClient: QueryClient): void {
  invalidateUnlessMutating(queryClient, ["sections"], SECTIONS_MUTATION_KEY);
}

/**
 * Bloque 4.5: manejador de `comments`, requirement "Comentarios en tiempo
 * real entre pestañas y dispositivos". Todas las claves de
 * `lib/comments/use-comments.ts` empiezan con `"comments"` (una por
 * tarea), así que invalidar ese único prefijo alcanza.
 */
export function onCommentsRealtimeEvent(queryClient: QueryClient): void {
  invalidateUnlessMutating(queryClient, ["comments"], COMMENTS_MUTATION_KEY);
}

/**
 * Bloque 4.10: manejador de `reminders`, para mantener sincronizados entre
 * pestañas y dispositivos tanto la lista de recordatorios de una tarea
 * (`lib/reminders/use-reminders.ts`, prefijo `["reminders", "task", id]`)
 * como el conteo del badge (`lib/reminders/use-app-badge.ts`, clave
 * `["reminders", "badge-count"]`) — las dos empiezan con `"reminders"`.
 */
export function onRemindersRealtimeEvent(queryClient: QueryClient): void {
  invalidateUnlessMutating(queryClient, ["reminders"], REMINDERS_MUTATION_KEY);
}

/**
 * Bloque 2.12: manejador de `filters`. `filtersQueryKey`
 * (`lib/filters/use-filters.ts`) es `["filters"]`, así que invalidar ese
 * único prefijo alcanza para la lista y el panel lateral.
 */
export function onFiltersRealtimeEvent(queryClient: QueryClient): void {
  invalidateUnlessMutating(queryClient, ["filters"], FILTERS_MUTATION_KEY);
}
