"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import type { Json } from "@/lib/supabase/database.types";
import { duplicateTaskTree } from "./duplicate";
import { reportTaskError } from "./errors";
import { snapshotTaskSubtree, restoreTaskSnapshot } from "./restore";
import {
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
 */

function listSnapshot(queryClient: QueryClient, projectId: string) {
  return queryClient.getQueryData<TaskRow[]>(tasksQueryKey(projectId));
}

function detailSnapshot(queryClient: QueryClient, id: string) {
  return queryClient.getQueryData<TaskDetail>(taskDetailQueryKey(id));
}

/** Crea una tarea (bloque 7.2): solo pide título, como el alta rápida — prioridad y fechas se editan después desde el detalle. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sectionId,
      parentId,
      title,
    }: {
      projectId: string;
      sectionId: string | null;
      parentId: string | null;
      title: string;
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const list = listSnapshot(queryClient, projectId) ?? [];
      const position = nextSiblingPositionInContext(list, { projectId, sectionId, parentId });

      const { data, error } = await supabase
        .from("tasks")
        .insert({ user_id: session.user.id, project_id: projectId, section_id: sectionId, parent_id: parentId, title, position })
        .select(
          "id, project_id, section_id, parent_id, title, priority, due_date, due_at, duration_minutes, deadline, completed_at, position",
        )
        .single();
      if (error) throw error;
      return { ...data, labels: [] } as TaskRow;
    },
    onError: reportTaskError,
    onSettled: (_data, _error, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) }),
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
}>;

/** `description` no es columna de `TaskRow` (las listas no la traen, ver `use-tasks.ts`): se descarta al parchear la caché de lista. */
function listPatchOf(patch: TaskPatch): Partial<TaskRow> {
  const rest: TaskPatch = { ...patch };
  delete rest.description;
  return rest;
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

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; projectId: string; patch: TaskPatch }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, projectId, patch }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey(projectId) });
      await queryClient.cancelQueries({ queryKey: taskDetailQueryKey(id) });
      const previousList = listSnapshot(queryClient, projectId);
      const previousDetail = detailSnapshot(queryClient, id);

      const listPatch = listPatchOf(patch);
      queryClient.setQueryData<TaskRow[]>(tasksQueryKey(projectId), (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...listPatch } : t)),
      );
      queryClient.setQueryData<TaskDetail>(taskDetailQueryKey(id), (old) => (old ? { ...old, ...patch } : old));

      return { previousList, previousDetail, projectId, id };
    },
    onError: (error, _vars, context) => {
      if (context?.previousList) queryClient.setQueryData(tasksQueryKey(context.projectId), context.previousList);
      if (context?.previousDetail) queryClient.setQueryData(taskDetailQueryKey(context.id), context.previousDetail);
      reportTaskError(error);
    },
    onSettled: (_data, _error, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(id) });
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
    },
  });
}

/** Duplica una tarea y sus subtareas (bloque 7.6, F2 del design): no es optimista, el `id` de la copia lo asigna el servidor. */
export function useDuplicateTask() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ task }: { task: TaskRow }) => {
      const list = listSnapshot(queryClient, task.project_id) ?? [];
      const position = positionAfterOriginal(list, task);
      return duplicateTaskTree(supabase, task.id, position);
    },
    onSuccess: () => toastSuccess("Tarea duplicada."),
    onError: reportTaskError,
    onSettled: (_data, _error, { task }) => queryClient.invalidateQueries({ queryKey: tasksQueryKey(task.project_id) }),
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

  return useMutation({
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
      toastSuccess("Tarea eliminada.", {
        action: {
          label: "Deshacer",
          onClick: () => {
            restoreTaskSnapshot(supabase, snapshot)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
                toastSuccess("Tarea restaurada.");
              })
              .catch(reportTaskError);
          },
        },
      });
    },
    onSettled: (_data, _error, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskDetailQueryKey(id) });
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
    },
  });
}
