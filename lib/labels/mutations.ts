"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import type { LabelFormOutput } from "@/lib/validation/labels";
import { reportLabelError } from "./errors";
import { labelsQueryKey, type Label } from "./use-labels";

/**
 * `mutationKey` común a este módulo (bloque 4.2), mismo patrón D3 que
 * `PROJECTS_MUTATION_KEY`/`TASKS_MUTATION_KEY`. No hay una suscripción de
 * Realtime sobre `labels`/`task_labels` (fuera de alcance de este bloque),
 * así que ningún manejador de `lib/realtime/handlers.ts` la usa todavía —
 * queda acá solo por consistencia con el resto de los módulos de
 * mutaciones.
 */
export const LABELS_MUTATION_KEY = ["labels"] as const;

/**
 * Sin Realtime sobre `labels`/`task_labels`, nada más invalida los chips ya
 * pintados en las listas y el detalle de tarea cuando se renombra,
 * recolorea o elimina una etiqueta. Todas las queries de tareas comparten
 * el prefijo `["tasks"]` (lista por proyecto, detalle, Hoy, Completado — ver
 * `lib/tasks/use-tasks.ts`, `use-task.ts`, `use-hoy-tasks.ts` y
 * `use-completed-tasks.ts`), así que invalidar ese único prefijo alcanza
 * para las cuatro de una sola vez.
 */
function invalidateLabelsAndTasks(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: labelsQueryKey });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

/** Crea una etiqueta (bloque 4.2). No es optimista: el `id` lo asigna el servidor. */
export function useCreateLabel() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: LABELS_MUTATION_KEY,
    mutationFn: async (input: LabelFormOutput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { data, error } = await supabase
        .from("labels")
        .insert({ user_id: session.user.id, name: input.name, color: input.color })
        .select("id, name, color, is_favorite")
        .single();
      if (error) throw error;
      return data as Label;
    },
    onSuccess: () => toastSuccess("Etiqueta creada."),
    onError: reportLabelError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: labelsQueryKey }),
  });
}

export type LabelPatch = Partial<Pick<Label, "name" | "color" | "is_favorite">>;

/**
 * Renombra o recolorea una etiqueta (bloque 4.2/4.5): camino optimista
 * (D2), igual que `useUpdateProject`. El `onSettled` invalida también
 * `["tasks"]` para que los chips existentes reflejen el cambio (requirement
 * "Renombrar/Recolorear una etiqueta existente").
 */
export function useUpdateLabel() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: LABELS_MUTATION_KEY,
    mutationFn: async ({ id, patch }: { id: string; patch: LabelPatch }) => {
      const { error } = await supabase.from("labels").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: labelsQueryKey });
      const previous = queryClient.getQueryData<Label[]>(labelsQueryKey);
      queryClient.setQueryData<Label[]>(labelsQueryKey, (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(labelsQueryKey, context.previous);
      reportLabelError(error);
    },
    onSettled: () => invalidateLabelsAndTasks(queryClient),
  });
}

/**
 * Elimina una etiqueta (bloque 4.2): la cascada real sobre `task_labels` la
 * garantiza la base (`on delete cascade` en `task_labels.label_id`, ya
 * existe); acá solo se ejecuta el `delete` sobre `labels` y se invalida
 * `["tasks"]` para que los chips desaparezcan de las tareas que la tenían
 * (requirement "Eliminar una etiqueta la quita de todas las tareas"). El
 * conteo de tareas afectadas y la confirmación viven en
 * `components/labels/delete-label-dialog.tsx`.
 */
export function useDeleteLabel() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: LABELS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labels").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: labelsQueryKey });
      const previous = queryClient.getQueryData<Label[]>(labelsQueryKey);
      queryClient.setQueryData<Label[]>(labelsQueryKey, (old) => (old ?? []).filter((l) => l.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(labelsQueryKey, context.previous);
      reportLabelError(error);
    },
    onSuccess: () => toastSuccess("Etiqueta eliminada. Esta acción no se puede deshacer."),
    onSettled: () => invalidateLabelsAndTasks(queryClient),
  });
}
