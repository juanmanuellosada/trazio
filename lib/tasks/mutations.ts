"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useUndoStack } from "@/components/providers/undo-provider";
import { playCompletionSound, playUncompletionSound } from "@/lib/completion-sound";
import type { RecurrenceAnchor } from "@/lib/recurrence/anchor";
import { createNextRecurringOccurrence, type NextOccurrence } from "@/lib/recurrence/create-next-occurrence";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import type { Json } from "@/lib/supabase/database.types";
import { duplicateTaskTree } from "./duplicate";
import { reportTaskError } from "./errors";
import { snapshotTaskSubtree, restoreTaskSnapshot } from "./restore";
import {
  SIBLING_SPACING,
  needsRebalance,
  nextSiblingPositionInContext,
  positionAfterOriginal,
  siblingsOfTask,
  taskSubtreeIds,
} from "./tree";
import { taskDetailQueryKey, type TaskDetail } from "./use-task";
import { tasksQueryKey, type LabelChip, type TaskRow } from "./use-tasks";

/**
 * Todas las mutaciones de tareas del bloque 7, sobre el mismo patrón que
 * `lib/projects/mutations.ts` y `lib/sections/mutations.ts`: TanStack Query,
 * optimistic updates en completar/editar/mover/reordenar (D2 del design),
 * revertir y avisar con el formato de tres partes si el servidor rechaza.
 *
 * A diferencia de esos dos módulos, acá `projectId` no queda cerrado en el
 * hook (no hay "el hook de tareas de este proyecto"): una tarea puede
 * mostrarse en la lista de un proyecto y, a la vez, en el panel de detalle
 * — dos cachés (`tasksQueryKey`/`taskDetailQueryKey`) que hay que mantener
 * sincronizadas. Por eso `projectId` viaja como variable de cada mutación,
 * no como argumento del hook: cada llamador (fila de lista, panel de
 * detalle) ya lo tiene a mano en el `TaskRow`/`TaskDetail` que edita.
 *
 * Bloque 8: Hoy y Completado (`lib/tasks/use-hoy-tasks.ts`,
 * `lib/tasks/use-completed-tasks.ts`) leen a través de proyectos, así que
 * además del caché del proyecto de origen hay que mantener sincronizados
 * esos dos cachés transversales — `HOY_QUERY_KEY`/`COMPLETADO_QUERY_KEY`
 * son prefijos: `invalidateQueries`/`setQueriesData` con ellos alcanzan
 * cualquier variante (la página de Completado que esté montada, sea cual
 * sea su `limit`).
 *
 * `calendario-legible-y-manipulable` (grupo 5, D-D): Próximos
 * (`upcomingTasksQueryKey`/`undatedTasksQueryKey`) tenía el mismo problema
 * transversal que Hoy/Completado, pero sin ninguno de los dos remedios —
 * arrastrar una tarea en su calendario no se veía hasta que llegaba un
 * aviso de Realtime. `PROXIMOS_QUERY_KEY`/`SIN_FECHA_QUERY_KEY` son el
 * mismo patrón de prefijo.
 */

const HOY_QUERY_KEY = ["tasks", "hoy"] as const;
const COMPLETADO_QUERY_KEY = ["tasks", "completado"] as const;
const PROXIMOS_QUERY_KEY = ["tasks", "proximos"] as const;
const SIN_FECHA_QUERY_KEY = ["tasks", "sin-fecha"] as const;

/**
 * `mutationKey` común a todas las mutaciones de este módulo (bloque 10.3,
 * regla D3): `lib/realtime/handlers.ts` lo usa con `queryClient.isMutating`
 * para saber si hay alguna en vuelo antes de invalidar por un evento de
 * Realtime sobre `tasks`.
 */
export const TASKS_MUTATION_KEY = ["tasks"] as const;

function listSnapshot(queryClient: QueryClient, projectId: string) {
  return queryClient.getQueryData<TaskRow[]>(tasksQueryKey(projectId));
}

function detailSnapshot(queryClient: QueryClient, id: string) {
  return queryClient.getQueryData<TaskDetail>(taskDetailQueryKey(id));
}

/** Después de cualquier mutación que no parchea Hoy/Completado/Próximos/Sin fecha a mano, los invalida para que se pongan al día (eventual, no instantáneo — la instantaneidad exigida por D2 en Hoy/Completado, y por D-D de `calendario-legible-y-manipulable` en Próximos, vive en `useUpdateTask`, que sí los parchea). */
function invalidateCrossViewCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: HOY_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: COMPLETADO_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: PROXIMOS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: SIN_FECHA_QUERY_KEY });
}

/**
 * Crea una tarea (bloque 7.2): solo pide título, como el alta rápida —
 * prioridad y fechas se editan después desde el detalle. `dueDate` es la
 * única excepción (bloque 8.2): el alta rápida de la vista Hoy la usa para
 * precargar la fecha de hoy, según el requirement "El botón de agregar
 * tarea de esta vista SHALL precargar la fecha de hoy".
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({
      projectId,
      sectionId,
      parentId,
      title,
      dueDate,
    }: {
      projectId: string;
      sectionId: string | null;
      parentId: string | null;
      title: string;
      dueDate?: string | null;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const list = listSnapshot(queryClient, projectId) ?? [];
      const position = nextSiblingPositionInContext(list, { projectId, sectionId, parentId });

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: session.user.id,
          project_id: projectId,
          section_id: sectionId,
          parent_id: parentId,
          title,
          position,
          due_date: dueDate ?? null,
        })
        .select(
          "id, project_id, section_id, parent_id, title, priority, due_date, due_at, duration_minutes, deadline, completed_at, position",
        )
        .single();
      if (error) throw error;
      return { ...data, labels: [] } as TaskRow;
    },
    onError: reportTaskError,
    onSettled: (_data, _error, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

export type TaskPatch = Partial<{
  title: string;
  description: Json | null;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  recurrence_rule: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  recurrence_anchor: RecurrenceAnchor | null;
}>;

/** `description` no es columna de `TaskRow` (las listas no la traen, ver `use-tasks.ts`): se descarta al parchear la caché de lista. */
function listPatchOf(patch: TaskPatch): Partial<TaskRow> {
  const rest: TaskPatch = { ...patch };
  delete rest.description;
  return rest;
}

/**
 * El parche inverso de una edición (bloque 5.11, D-F): para cada campo que
 * cambió, el valor que tenía antes, leído de lo que ya había en caché
 * (`previousDetail` trae todo, incluida `description`; `previousRow` cubre
 * el resto cuando no había detalle cacheado — ej. completar desde una fila
 * de lista sin abrir el panel). `null` si falta el valor anterior de algún
 * campo: sin un valor confiable, no se arma un deshacer que rompa algo.
 */
function inversePatchOf(patch: TaskPatch, previousDetail?: TaskDetail, previousRow?: TaskRow): TaskPatch | null {
  const detail = previousDetail as unknown as Record<string, unknown> | undefined;
  const row = previousRow as unknown as Record<string, unknown> | undefined;
  const inverse: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    if (detail && key in detail) inverse[key] = detail[key];
    else if (row && key in row) inverse[key] = row[key];
    else return null;
  }
  return inverse as TaskPatch;
}

/** Etiqueta en español de la pila de deshacer (bloque 5.11/5.12), según qué cambió el parche. */
function describePatch(patch: TaskPatch): string {
  if ("completed_at" in patch) {
    return patch.completed_at ? "Tarea completada." : "Tarea marcada como pendiente.";
  }
  return "Tarea editada.";
}

/**
 * Actualiza cualquier campo propio de una tarea (bloque 7.2/7.3/7.4): título
 * y descripción autoguardados desde el detalle, prioridad/fecha/duración/
 * fecha límite editados al instante, y completar/descompletar (el criterio
 * de aceptación literal de la fase) son todos el mismo camino optimista.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { push } = useUndoStack();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ id, patch }: { id: string; projectId: string; patch: TaskPatch }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;

      // Bloque 5.4: completar una tarea recurrente (patch.completed_at
      // truthy, nunca al descompletar) crea la siguiente instancia. Un
      // error acá no revierte la tarea ya completada — solo se avisa, y
      // `nextOccurrence` queda en `null` para que el deshacer (más abajo, en
      // `onSuccess`) sepa que no hay nada para borrar.
      let nextOccurrence: NextOccurrence | null = null;
      if (patch.completed_at) {
        try {
          nextOccurrence = await createNextRecurringOccurrence(supabase, id);
        } catch (recurrenceError) {
          reportTaskError(recurrenceError);
        }
      }
      return { nextOccurrence };
    },
    onMutate: async ({ id, projectId, patch }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey(projectId) });
      await queryClient.cancelQueries({ queryKey: taskDetailQueryKey(id) });
      await queryClient.cancelQueries({ queryKey: HOY_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: COMPLETADO_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROXIMOS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: SIN_FECHA_QUERY_KEY });

      const previousList = listSnapshot(queryClient, projectId);
      const previousDetail = detailSnapshot(queryClient, id);
      const previousHoy = queryClient.getQueriesData<TaskRow[]>({ queryKey: HOY_QUERY_KEY });
      const previousCompleted = queryClient.getQueriesData<TaskRow[]>({ queryKey: COMPLETADO_QUERY_KEY });
      const previousProximos = queryClient.getQueriesData<TaskRow[]>({ queryKey: PROXIMOS_QUERY_KEY });
      const previousSinFecha = queryClient.getQueriesData<TaskRow[]>({ queryKey: SIN_FECHA_QUERY_KEY });

      const listPatch = listPatchOf(patch);
      queryClient.setQueryData<TaskRow[]>(tasksQueryKey(projectId), (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...listPatch } : t)),
      );
      queryClient.setQueryData<TaskDetail>(taskDetailQueryKey(id), (old) => (old ? { ...old, ...patch } : old));
      // Hoy, Completado, Próximos y Sin fecha también parchean acá (no solo
      // invalidan en onSettled): completar/descompletar o mover una tarea
      // (arrastre en el calendario de Próximos, `calendario-legible-y-manipulable`
      // grupo 5, D-D) tiene que verse instantáneo en todas las vistas, y
      // ninguna tiene un `onMutate` propio que lo haga por su cuenta.
      queryClient.setQueriesData<TaskRow[]>({ queryKey: HOY_QUERY_KEY }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...listPatch } : t)),
      );
      queryClient.setQueriesData<TaskRow[]>({ queryKey: COMPLETADO_QUERY_KEY }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...listPatch } : t)),
      );
      queryClient.setQueriesData<TaskRow[]>({ queryKey: PROXIMOS_QUERY_KEY }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...listPatch } : t)),
      );
      queryClient.setQueriesData<TaskRow[]>({ queryKey: SIN_FECHA_QUERY_KEY }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...listPatch } : t)),
      );

      const inversePatch = inversePatchOf(patch, previousDetail, previousList?.find((t) => t.id === id));

      return { previousList, previousDetail, previousHoy, previousCompleted, previousProximos, previousSinFecha, projectId, id, inversePatch };
    },
    onError: (error, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(tasksQueryKey(context.projectId), context.previousList);
      if (context?.previousDetail) queryClient.setQueryData(taskDetailQueryKey(context.id), context.previousDetail);
      context?.previousHoy?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.previousCompleted?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.previousProximos?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.previousSinFecha?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      reportTaskError(error);
    },
    onSuccess: (data, { id, projectId, patch }, context) => {
      // `sonido-al-completar`/`sonido-al-descompletar` (D-B/D-C): antes del
      // retorno temprano de abajo, o se pierde el caso donde no había valor
      // anterior en caché (sin `inversePatch` no hay nada para deshacer, pero
      // el sonido igual tiene que sonar). Condicionado a la forma del cambio
      // —que el patch traiga la clave `completed_at`—, no a "la mutación de
      // tarea salió bien": el autoguardado de la descripción pasa por este
      // mismo callback sin gesto del usuario, y `completed_at` nunca viaja
      // en su patch, así que no entra acá. Misma condición que
      // `describePatch` (arriba), leída al revés: truthy es completar,
      // falsy (`null`) es descompletar.
      if ("completed_at" in patch) {
        if (patch.completed_at) playCompletionSound();
        else playUncompletionSound();
      }

      // Bloque 5.11: empuja completar/descompletar y cualquier edición de
      // campos a la pila de deshacer. Sin toast acá (`.claude/rules/frontend.md`
      // solo lo exige para acciones destructivas) — el toast de eliminar ya
      // vive en `useDeleteTask`.
      if (!context?.inversePatch) return;
      const inversePatch = context.inversePatch;
      const nextOccurrence = data?.nextOccurrence ?? null;
      push({
        label: describePatch(patch),
        undo: async () => {
          const { error } = await supabase.from("tasks").update(inversePatch).eq("id", id);
          if (error) {
            reportTaskError(error);
            return;
          }
          // Deshacer completar una recurrente también borra la instancia
          // que ese completado generó (deshacer es volver al estado
          // anterior, y una instancia huérfana lo contradice). Pero solo si
          // nadie la tocó todavía: si ya la editaron o la completaron, su
          // `updated_at` cambió (trigger `tasks_set_updated_at_trigger`,
          // migración `20260729160000`) y no coincide con el que tenía
          // recién creada — en ese caso, conservador, no se borra: sería
          // destruir trabajo del usuario.
          if (nextOccurrence) {
            const { data: current } = await supabase
              .from("tasks")
              .select("updated_at")
              .eq("id", nextOccurrence.id)
              .maybeSingle();
            if (current?.updated_at === nextOccurrence.updatedAt) {
              await supabase.from("tasks").delete().eq("id", nextOccurrence.id);
            }
          }
          queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(id) });
          invalidateCrossViewCaches(queryClient);
        },
      });
    },
    onSettled: (_data, _error, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(id) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

export type MoveTaskVariables = {
  id: string;
  fromProjectId: string;
  toProjectId: string;
  sectionId: string | null;
  parentId: string | null;
  position: number;
};

/**
 * Mueve una tarea (bloque 7.7/7.8): entre secciones o proyectos, por
 * arrastre, por indentar/desindentar (`Tab`/`Shift+Tab`, camino nuevo y
 * exclusivo de tareas) o por "mover arriba/abajo" del menú contextual —
 * todo el mismo camino, igual que `useMoveProject` unifica reordenar y
 * anidar. Si el proyecto destino es distinto, cascadea `project_id` a toda
 * la subtarea (una tarea no puede quedar en un proyecto distinto del de su
 * padre) y le limpia el `section_id`, que ya no tiene sentido ahí.
 */
export function useMoveTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ id, fromProjectId, toProjectId, sectionId, parentId, position }: MoveTaskVariables) => {
      const { error } = await supabase
        .from("tasks")
        .update({ project_id: toProjectId, section_id: sectionId, parent_id: parentId, position })
        .eq("id", id);
      if (error) throw error;

      if (fromProjectId !== toProjectId) {
        const fromList = listSnapshot(queryClient, fromProjectId) ?? [];
        const descendantIds = taskSubtreeIds(fromList, id).filter((descendantId) => descendantId !== id);
        if (descendantIds.length > 0) {
          const { error: cascadeError } = await supabase
            .from("tasks")
            .update({ project_id: toProjectId, section_id: null })
            .in("id", descendantIds);
          if (cascadeError) throw cascadeError;
        }
      }

      const destinationSiblings = siblingsOfTask(
        listSnapshot(queryClient, toProjectId) ?? [],
        { projectId: toProjectId, sectionId, parentId },
        id,
      );
      if (needsRebalance(destinationSiblings.map((s) => s.position), position)) {
        await supabase.rpc("rebalance_task_positions", {
          p_project_id: toProjectId,
          p_section_id: sectionId ?? undefined,
        });
      }
    },
    onMutate: async ({ id, fromProjectId, toProjectId, sectionId, parentId, position }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey(fromProjectId) });
      if (toProjectId !== fromProjectId) await queryClient.cancelQueries({ queryKey: tasksQueryKey(toProjectId) });
      await queryClient.cancelQueries({ queryKey: taskDetailQueryKey(id) });

      const previousFromList = listSnapshot(queryClient, fromProjectId);
      const previousToList = toProjectId !== fromProjectId ? listSnapshot(queryClient, toProjectId) : undefined;
      const previousDetail = detailSnapshot(queryClient, id);

      if (toProjectId === fromProjectId) {
        queryClient.setQueryData<TaskRow[]>(tasksQueryKey(fromProjectId), (old) =>
          (old ?? []).map((t) => (t.id === id ? { ...t, section_id: sectionId, parent_id: parentId, position } : t)),
        );
      } else {
        const movingIds = new Set(taskSubtreeIds(previousFromList ?? [], id));
        const moving = (previousFromList ?? []).filter((t) => movingIds.has(t.id));
        queryClient.setQueryData<TaskRow[]>(tasksQueryKey(fromProjectId), (old) =>
          (old ?? []).filter((t) => !movingIds.has(t.id)),
        );
        if (previousToList !== undefined) {
          const cascaded = moving.map((t) =>
            t.id === id
              ? { ...t, project_id: toProjectId, section_id: sectionId, parent_id: parentId, position }
              : { ...t, project_id: toProjectId, section_id: null },
          );
          queryClient.setQueryData<TaskRow[]>(tasksQueryKey(toProjectId), (old) => [
            ...(old ?? []).filter((t) => !movingIds.has(t.id)),
            ...cascaded,
          ]);
        }
      }

      if (previousDetail && previousDetail.id === id) {
        queryClient.setQueryData<TaskDetail>(taskDetailQueryKey(id), {
          ...previousDetail,
          project_id: toProjectId,
          section_id: sectionId,
          parent_id: parentId,
          position,
        });
      }

      return { previousFromList, previousToList, previousDetail, fromProjectId, toProjectId, id };
    },
    onError: (error, _vars, context) => {
      if (context?.previousFromList) {
        queryClient.setQueryData(tasksQueryKey(context.fromProjectId), context.previousFromList);
      }
      if (context && context.toProjectId !== context.fromProjectId && context.previousToList !== undefined) {
        queryClient.setQueryData(tasksQueryKey(context.toProjectId), context.previousToList);
      }
      if (context?.previousDetail) queryClient.setQueryData(taskDetailQueryKey(context.id), context.previousDetail);
      reportTaskError(error);
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(vars.fromProjectId) });
      if (vars.toProjectId !== vars.fromProjectId) {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey(vars.toProjectId) });
      }
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(vars.id) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/** Duplica una tarea y sus subtareas (bloque 7.6, F2 del design): no es optimista, el `id` de la copia lo asigna el servidor. */
export function useDuplicateTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ task }: { task: TaskRow }) => {
      const list = listSnapshot(queryClient, task.project_id) ?? [];
      const position = positionAfterOriginal(list, task);
      return duplicateTaskTree(supabase, task.id, position);
    },
    onSuccess: () => toastSuccess("Tarea duplicada."),
    onError: reportTaskError,
    onSettled: (_data, _error, { task }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(task.project_id) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/**
 * Elimina una tarea (bloque 7.9), con sus subtareas en cascada (`on delete
 * cascade` de `parent_id`, borrado físico). Ofrece deshacer
 * (`.claude/rules/frontend.md`): antes de borrar, guarda una foto de toda
 * la subtarea (`snapshotTaskSubtree`) y, si se toca "Deshacer" en el toast,
 * la recrea tal cual estaba (`restoreTaskSnapshot`).
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { push, undoById } = useUndoStack();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const snapshot = await snapshotTaskSubtree(supabase, id);
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return snapshot;
    },
    onMutate: async ({ id, projectId }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey(projectId) });
      const previousList = listSnapshot(queryClient, projectId);
      const removeIds = new Set(taskSubtreeIds(previousList ?? [], id));
      queryClient.setQueryData<TaskRow[]>(tasksQueryKey(projectId), (old) =>
        (old ?? []).filter((t) => !removeIds.has(t.id)),
      );
      return { previousList, projectId };
    },
    onError: (error, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(tasksQueryKey(context.projectId), context.previousList);
      reportTaskError(error);
    },
    onSuccess: (snapshot, { projectId }) => {
      // Bloque 5.11/5.12: el mismo descriptor alimenta la pila de deshacer
      // y el toast — deshacer desde el toast pasa por `undoById`, que la
      // saca de la pila en el mismo paso (no queda disponible una segunda
      // vez para `Ctrl/Cmd+Z`).
      const restore = () =>
        restoreTaskSnapshot(supabase, snapshot)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
            toastSuccess("Tarea restaurada.");
          })
          .catch(reportTaskError);

      const undoId = push({ label: "Tarea eliminada.", undo: restore });

      toastSuccess("Tarea eliminada.", {
        action: {
          label: "Deshacer",
          onClick: () => {
            void undoById(undoId);
          },
        },
      });
    },
    onSettled: (_data, _error, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(id) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/**
 * Borra una tarea sin título (bloque `saltar-al-detalle-desde-el-alta`, D46):
 * a diferencia de `useDeleteTask`, sin toast ni deshacer — no titularla
 * equivale a no haberla creado, así que la persona nunca llegó a percibir
 * que existía y no hay nada que ofrecerle deshacer. La usa
 * `task-detail-content.tsx` al desmontarse el detalle de una tarea que
 * "Abrir detalle" creó vacía y que se cierra sin haber cargado un título.
 */
export function useDeleteEmptyTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onError: reportTaskError,
    onSettled: (_data, _error, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(id) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/**
 * Reemplaza el conjunto completo de etiquetas de una tarea (bloque 7.12,
 * requirement "Asignar y quitar etiquetas desde el detalle de la tarea"):
 * borra todas las asignaciones existentes e inserta las nuevas, nunca altas
 * y bajas incrementales.
 */
export function useReplaceTaskLabels() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ taskId, labels }: { taskId: string; projectId: string; labels: LabelChip[] }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error: deleteError } = await supabase.from("task_labels").delete().eq("task_id", taskId);
      if (deleteError) throw deleteError;

      if (labels.length > 0) {
        const { error: insertError } = await supabase
          .from("task_labels")
          .insert(labels.map((label) => ({ task_id: taskId, label_id: label.id, user_id: session.user.id })));
        if (insertError) throw insertError;
      }
    },
    onMutate: async ({ taskId, projectId, labels }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey(projectId) });
      await queryClient.cancelQueries({ queryKey: taskDetailQueryKey(taskId) });
      const previousList = listSnapshot(queryClient, projectId);
      const previousDetail = detailSnapshot(queryClient, taskId);

      queryClient.setQueryData<TaskRow[]>(tasksQueryKey(projectId), (old) =>
        (old ?? []).map((t) => (t.id === taskId ? { ...t, labels } : t)),
      );
      queryClient.setQueryData<TaskDetail>(taskDetailQueryKey(taskId), (old) => (old ? { ...old, labels } : old));

      return { previousList, previousDetail, projectId, taskId };
    },
    onError: (error, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(tasksQueryKey(context.projectId), context.previousList);
      if (context?.previousDetail) {
        queryClient.setQueryData(taskDetailQueryKey(context.taskId), context.previousDetail);
      }
      reportTaskError(error);
    },
    onSettled: (_data, _error, { taskId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(taskId) });
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/**
 * Una tarea seleccionada, con el proyecto al que pertenece (bloque 7.10-7.13,
 * capacidad `seleccion-multiple`): la selección puede cruzar proyectos (Hoy,
 * Próximos, Etiqueta y Filtro muestran tareas de cualquier proyecto a la
 * vez), así que las mutaciones en lote no pueden cerrar un solo `projectId`
 * como hook — cada tarea trae el suyo, igual que ya hace `useUpdateTask` por
 * variable de mutación en vez de argumento del hook.
 */
export type BulkTaskRef = { id: string; projectId: string };

function pluralTareas(count: number): string {
  return count === 1 ? "tarea" : "tareas";
}

/** Etiqueta en español de la pila de deshacer para una acción en lote (bloque 7.12): una sola entrada por lote, sin importar cuántas tareas afecte. */
function describeBulkPatch(patch: TaskPatch, count: number): string {
  const plural = pluralTareas(count);
  if ("priority" in patch) return `Prioridad cambiada en ${count} ${plural}.`;
  if ("due_date" in patch || "due_at" in patch) return `Fecha cambiada en ${count} ${plural}.`;
  return `${count} ${plural} editadas.`;
}

/**
 * Aplica el mismo parche a varias tareas a la vez (bloque 7.11: cambiar
 * prioridad o cambiar fecha en lote, con Hoy/Mañana/Sin fecha), como **una
 * sola** entrada de deshacer (bloque 7.12, requirement "Las acciones en
 * lote son deshacibles como una sola acción") — deshacerla revierte el
 * parche inverso de cada tarea en un solo paso, no una vez por tarea.
 */
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { push } = useUndoStack();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ tasks, patch }: { tasks: BulkTaskRef[]; patch: TaskPatch }) => {
      const { error } = await supabase
        .from("tasks")
        .update(patch)
        .in(
          "id",
          tasks.map((t) => t.id),
        );
      if (error) throw error;
    },
    onMutate: async ({ tasks, patch }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      await Promise.all(projectIds.map((pid) => queryClient.cancelQueries({ queryKey: tasksQueryKey(pid) })));

      const previousLists = new Map(projectIds.map((pid) => [pid, listSnapshot(queryClient, pid)]));
      const idSet = new Set(tasks.map((t) => t.id));
      const listPatch = listPatchOf(patch);

      for (const pid of projectIds) {
        queryClient.setQueryData<TaskRow[]>(tasksQueryKey(pid), (old) =>
          (old ?? []).map((t) => (idSet.has(t.id) ? { ...t, ...listPatch } : t)),
        );
      }
      queryClient.setQueriesData<TaskRow[]>({ queryKey: HOY_QUERY_KEY }, (old) =>
        old?.map((t) => (idSet.has(t.id) ? { ...t, ...listPatch } : t)),
      );
      queryClient.setQueriesData<TaskRow[]>({ queryKey: COMPLETADO_QUERY_KEY }, (old) =>
        old?.map((t) => (idSet.has(t.id) ? { ...t, ...listPatch } : t)),
      );

      return { previousLists, projectIds };
    },
    onError: (error, _vars, context) => {
      context?.previousLists.forEach((list, pid) => {
        if (list) queryClient.setQueryData(tasksQueryKey(pid), list);
      });
      reportTaskError(error);
    },
    onSuccess: (_data, { tasks, patch }, context) => {
      // `sonido-al-completar`/`sonido-al-descompletar` (2.5, preventivo): no
      // hay hoy un "completar en lote" en la interfaz —esta mutación solo se
      // usa para prioridad y fecha (ver el docstring de arriba)—, pero si
      // `patch` alguna vez trae la clave `completed_at`, tiene que sonar
      // **una vez por lote**, no una por tarea: por eso el llamado va acá,
      // en el único `onSuccess` del lote, y no adentro del `for`/`Promise.all`
      // de `mutationFn`.
      if ("completed_at" in patch) {
        if (patch.completed_at) playCompletionSound();
        else playUncompletionSound();
      }

      if (!context) return;
      const inverses = tasks
        .map((t) => {
          const previousRow = context.previousLists.get(t.projectId)?.find((row) => row.id === t.id);
          const inversePatch = inversePatchOf(patch, undefined, previousRow);
          return inversePatch ? { id: t.id, patch: inversePatch } : null;
        })
        .filter((entry): entry is { id: string; patch: TaskPatch } => entry != null);
      if (inverses.length === 0) return;

      push({
        label: describeBulkPatch(patch, tasks.length),
        undo: async () => {
          await Promise.all(inverses.map(({ id, patch: inversePatch }) => supabase.from("tasks").update(inversePatch).eq("id", id)));
          context.projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
          invalidateCrossViewCaches(queryClient);
        },
      });
    },
    onSettled: (_data, _error, { tasks }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/**
 * Mueve varias tareas al mismo proyecto y sección (bloque 7.11: "mover a
 * otro proyecto o sección"), todas a primer nivel del destino (igual que
 * `moveTo` del detalle de tarea achata una subtarea movida) y en una sola
 * entrada de deshacer. No es optimista para el `project_id`/`section_id`
 * (a diferencia de `useMoveTask`, que sí lo es para un solo arrastre): acá
 * el lote puede ser grande y cruzar varios proyectos de origen, así que se
 * invalida en vez de parchear cada caché a mano.
 */
export function useBulkMoveTasks() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { push } = useUndoStack();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    onMutate: async ({ tasks }: { tasks: BulkTaskRef[]; toProjectId: string; toSectionId: string | null }) => {
      // Foto de "de dónde vino" cada tarea (proyecto, sección, padre y
      // posición) antes de moverla: es lo que el deshacer necesita para
      // devolverla exactamente a su lugar, no solo a su proyecto de origen.
      const previousRows = new Map<string, Pick<TaskRow, "project_id" | "section_id" | "parent_id" | "position">>();
      for (const t of tasks) {
        const row = listSnapshot(queryClient, t.projectId)?.find((r) => r.id === t.id);
        if (row) {
          previousRows.set(t.id, {
            project_id: row.project_id,
            section_id: row.section_id,
            parent_id: row.parent_id,
            position: row.position,
          });
        }
      }
      return { previousRows };
    },
    mutationFn: async ({
      tasks,
      toProjectId,
      toSectionId,
    }: {
      tasks: BulkTaskRef[];
      toProjectId: string;
      toSectionId: string | null;
    }) => {
      const destinationList = listSnapshot(queryClient, toProjectId) ?? [];
      const base = nextSiblingPositionInContext(destinationList, {
        projectId: toProjectId,
        sectionId: toSectionId,
        parentId: null,
      });

      for (const [index, task] of tasks.entries()) {
        const { error } = await supabase
          .from("tasks")
          .update({
            project_id: toProjectId,
            section_id: toSectionId,
            parent_id: null,
            position: base + index * SIBLING_SPACING,
          })
          .eq("id", task.id);
        if (error) throw error;

        // Igual que `useMoveTask`: si cruza de proyecto, cascadea `project_id`
        // a todo el subárbol (una tarea no puede quedar en un proyecto
        // distinto del de su padre) — la selección múltiple solo ofrece
        // casillero en tareas de primer nivel (bloque 7.10), así que una
        // tarea movida en lote puede traer subtareas propias sin seleccionar.
        if (task.projectId !== toProjectId) {
          const originList = listSnapshot(queryClient, task.projectId) ?? [];
          const descendantIds = taskSubtreeIds(originList, task.id).filter((id) => id !== task.id);
          if (descendantIds.length > 0) {
            const { error: cascadeError } = await supabase
              .from("tasks")
              .update({ project_id: toProjectId, section_id: null })
              .in("id", descendantIds);
            if (cascadeError) throw cascadeError;
          }
        }
      }
    },
    onSuccess: (_data, { tasks }, context) => {
      push({
        label: `${tasks.length} ${pluralTareas(tasks.length)} movidas.`,
        undo: async () => {
          await Promise.all(
            tasks.map((t) => {
              const previous = context?.previousRows.get(t.id);
              if (!previous) return Promise.resolve();
              return supabase.from("tasks").update(previous).eq("id", t.id);
            }),
          );
          const projectIds = new Set(tasks.map((t) => t.projectId));
          context?.previousRows.forEach((row) => projectIds.add(row.project_id));
          projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
          invalidateCrossViewCaches(queryClient);
        },
      });
    },
    onError: reportTaskError,
    onSettled: (_data, _error, { tasks, toProjectId }) => {
      const projectIds = new Set([...tasks.map((t) => t.projectId), toProjectId]);
      projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/**
 * Elimina varias tareas a la vez (bloque 7.11 "eliminar", bloque 7.12): una
 * sola entrada de deshacer restaura las doce de una vez, no una por una
 * (requirement "Deshacer una eliminación en lote de 12 tareas la revierte
 * de una vez"). Cada tarea guarda su propia foto (subtareas, etiquetas y
 * comentarios) con `snapshotTaskSubtree`, igual que `useDeleteTask`.
 */
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { push, undoById } = useUndoStack();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ tasks }: { tasks: BulkTaskRef[] }) => {
      const snapshots = await Promise.all(tasks.map((t) => snapshotTaskSubtree(supabase, t.id)));
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in(
          "id",
          tasks.map((t) => t.id),
        );
      if (error) throw error;
      return snapshots;
    },
    onMutate: async ({ tasks }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      await Promise.all(projectIds.map((pid) => queryClient.cancelQueries({ queryKey: tasksQueryKey(pid) })));
      const previousLists = new Map(projectIds.map((pid) => [pid, listSnapshot(queryClient, pid)]));
      const idSet = new Set(tasks.map((t) => t.id));
      for (const pid of projectIds) {
        queryClient.setQueryData<TaskRow[]>(tasksQueryKey(pid), (old) => (old ?? []).filter((t) => !idSet.has(t.id)));
      }
      return { previousLists };
    },
    onError: (error, _vars, context) => {
      context?.previousLists.forEach((list, pid) => {
        if (list) queryClient.setQueryData(tasksQueryKey(pid), list);
      });
      reportTaskError(error);
    },
    onSuccess: (snapshots, { tasks }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      const restore = async () => {
        for (const snapshot of snapshots) await restoreTaskSnapshot(supabase, snapshot);
        projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
        toastSuccess(`${tasks.length} ${pluralTareas(tasks.length)} restauradas.`);
      };

      const undoId = push({ label: `${tasks.length} ${pluralTareas(tasks.length)} eliminadas.`, undo: restore });

      toastSuccess(`${tasks.length} ${pluralTareas(tasks.length)} eliminadas.`, {
        action: {
          label: "Deshacer",
          onClick: () => {
            void undoById(undoId);
          },
        },
      });
    },
    onSettled: (_data, _error, { tasks }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
      invalidateCrossViewCaches(queryClient);
    },
  });
}

/** Las etiquetas de `toApply` que `existing` todavía no tiene. */
function addedLabels(existing: LabelChip[], toApply: LabelChip[]): LabelChip[] {
  const existingIds = new Set(existing.map((l) => l.id));
  return toApply.filter((l) => !existingIds.has(l.id));
}

/**
 * Suma etiquetas a varias tareas a la vez (bloque 7.11, capacidad
 * `seleccion-multiple`; D-C de `seleccion-con-ctrl`): a diferencia de
 * `useReplaceTaskLabels` (una sola tarea, reemplaza el conjunto completo),
 * acá cada tarea CONSERVA las etiquetas que ya tenía — al editar varias a la
 * vez no se ve lo que cada una tiene, y reemplazar destruiría información
 * que no se estaba mirando. `upsert` con `ignoreDuplicates` deja mandar la
 * matriz completa tarea×etiqueta sin chocar contra los pares que una tarea
 * ya tuviera (la PK de `task_labels` es compuesta `(task_id, label_id)`).
 *
 * Quitar una etiqueta de varias tareas no existe (fuera de alcance, D-C): el
 * deshacer de esta mutación solo borra los pares que ella misma agregó, para
 * no arrastrar por error una etiqueta que la tarea ya traía de antes.
 */
export function useBulkAddLabels() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { push } = useUndoStack();

  return useMutation({
    mutationKey: TASKS_MUTATION_KEY,
    mutationFn: async ({ tasks, labels }: { tasks: BulkTaskRef[]; labels: LabelChip[] }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const rows = tasks.flatMap((task) =>
        labels.map((label) => ({ task_id: task.id, label_id: label.id, user_id: session.user.id })),
      );
      const { error } = await supabase
        .from("task_labels")
        .upsert(rows, { onConflict: "task_id,label_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onMutate: async ({ tasks, labels }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      await Promise.all(projectIds.map((pid) => queryClient.cancelQueries({ queryKey: tasksQueryKey(pid) })));
      const previousLists = new Map(projectIds.map((pid) => [pid, listSnapshot(queryClient, pid)]));
      const idSet = new Set(tasks.map((t) => t.id));

      function withAddedLabels(row: TaskRow): TaskRow {
        if (!idSet.has(row.id)) return row;
        const toAdd = addedLabels(row.labels, labels);
        return toAdd.length === 0 ? row : { ...row, labels: [...row.labels, ...toAdd] };
      }

      projectIds.forEach((pid) =>
        queryClient.setQueryData<TaskRow[]>(tasksQueryKey(pid), (old) => old?.map(withAddedLabels)),
      );
      queryClient.setQueriesData<TaskRow[]>({ queryKey: HOY_QUERY_KEY }, (old) => old?.map(withAddedLabels));
      queryClient.setQueriesData<TaskRow[]>({ queryKey: COMPLETADO_QUERY_KEY }, (old) => old?.map(withAddedLabels));

      return { previousLists };
    },
    onError: (error, _vars, context) => {
      context?.previousLists.forEach((list, pid) => {
        if (list) queryClient.setQueryData(tasksQueryKey(pid), list);
      });
      reportTaskError(error);
    },
    onSuccess: (_data, { tasks, labels }, context) => {
      if (!context) return;
      const perTaskAdded = tasks
        .map((t) => {
          const previousRow = context.previousLists.get(t.projectId)?.find((row) => row.id === t.id);
          const toAdd = addedLabels(previousRow?.labels ?? [], labels);
          return toAdd.length > 0 ? { taskId: t.id, labelIds: toAdd.map((l) => l.id) } : null;
        })
        .filter((entry): entry is { taskId: string; labelIds: string[] } => entry != null);
      if (perTaskAdded.length === 0) return;

      push({
        label: `Etiquetas agregadas en ${tasks.length} ${pluralTareas(tasks.length)}.`,
        undo: async () => {
          await Promise.all(
            perTaskAdded.map(({ taskId, labelIds }) =>
              supabase.from("task_labels").delete().eq("task_id", taskId).in("label_id", labelIds),
            ),
          );
          const projectIds = [...new Set(tasks.map((t) => t.projectId))];
          projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
          invalidateCrossViewCaches(queryClient);
        },
      });
    },
    onSettled: (_data, _error, { tasks }) => {
      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      projectIds.forEach((pid) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(pid) }));
      invalidateCrossViewCaches(queryClient);
    },
  });
}
