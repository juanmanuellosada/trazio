"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { colorForLabelName } from "@/lib/labels/color-for-name";
import { labelsQueryKey } from "@/lib/labels/use-labels";
import type { Json } from "@/lib/supabase/database.types";
import { reportTaskError } from "@/lib/tasks/errors";
import { nextSiblingPositionInContext } from "@/lib/tasks/tree";
import { tasksQueryKey, type TaskRow } from "@/lib/tasks/use-tasks";
import type { DraftReminder } from "@/lib/reminders/use-reminders";
import type { ParseResult } from "./types";

// Mismo prefijo que usa `lib/tasks/mutations.ts` para Hoy y Completado — no
// están exportados desde ahí (cada mutación define su copia), así que esto
// sigue el mismo patrón en vez de inventar uno nuevo.
const HOY_QUERY_KEY = ["tasks", "hoy"] as const;
const COMPLETADO_QUERY_KEY = ["tasks", "completado"] as const;

export type CreateTaskFromParseVariables = {
  /** Título ya sin los tokens reconocidos (bloque 9.20: se quitan al confirmar, salvo los desactivados con doble clic). */
  title: string;
  /**
   * Proyecto/sección final donde va a quedar la tarea (bloque 5.4/5.5 del
   * componente de alta): quien llama ya resolvió el destino —contexto de la
   * vista, `#` reconocido por el parser, o el selector de destino explícito,
   * en ese orden de prioridad— así que acá no queda ninguna resolución
   * pendiente, solo el insert.
   */
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  /** `null` cuando el campo de descripción del alta quedó vacío. */
  description: Json | null;
  /** `yyyy-MM-dd` del selector de fecha límite, o `null` (el parser no reconoce fecha límite). */
  deadline: string | null;
  /** Resultado del parser ya filtrado por los matches que el usuario no desactivó. */
  result: ParseResult;
  /**
   * Posición explícita (bloque `menu-contextual-de-tarea`, "Agregar tarea
   * encima/debajo", D-D): quien llama ya la calculó con las primitivas de
   * `lib/tasks/tree.ts` (`positionBeforeOriginal`/`positionAfterOriginal`).
   * Sin especificar, se mantiene el comportamiento de siempre: última
   * hermana del contexto (`nextSiblingPositionInContext`).
   */
  position?: number;
  /**
   * Recordatorios elegidos en `ReminderPicker` en modo borrador (bloque
   * `alta-de-tareas-en-contexto`, D-E): todavía no existe ningún `taskId`
   * contra el cual persistirlos, así que viajan acá y se insertan en el
   * mismo viaje que la tarea, igual patrón que las etiquetas de `#`.
   */
  reminders?: DraftReminder[];
};

/**
 * Crea una tarea con todo lo que reconoció el parser (bloque 9.20/9.21):
 * arma el conjunto de etiquetas creando las que no existan (OQ1) y hace un
 * solo insert con título, proyecto/sección (el de `#` si lo hubo, si no el
 * de dónde vive el campo), fecha, hora, duración, prioridad y RRULE juntos.
 *
 * No reutiliza `useCreateTask` de `lib/tasks/mutations.ts`: esa mutación
 * (bloque 7.2) solo acepta título y `dueDate`, porque el alta simple no
 * necesita más. Acá sí hace falta setear todos los atributos en el mismo
 * viaje — dos mutaciones encadenadas (crear y después actualizar)
 * dejarían una ventana con la tarea a medio completar si la segunda falla.
 */
export function useCreateTaskFromParse() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      title,
      projectId,
      sectionId,
      parentId,
      description,
      deadline,
      result,
      reminders,
      position: explicitPosition,
    }: CreateTaskFromParseVariables) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const labelIds: string[] = [];
      for (const label of result.labels) {
        if (label.id) {
          labelIds.push(label.id);
          continue;
        }
        const { data: created, error: labelError } = await supabase
          .from("labels")
          .insert({ user_id: session.user.id, name: label.name, color: colorForLabelName(label.name) })
          .select("id")
          .single();
        if (labelError) throw labelError;
        labelIds.push(created.id);
      }

      const list = queryClient.getQueryData<TaskRow[]>(tasksQueryKey(projectId)) ?? [];
      const position = explicitPosition ?? nextSiblingPositionInContext(list, { projectId, sectionId, parentId });

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          user_id: session.user.id,
          project_id: projectId,
          section_id: sectionId,
          parent_id: parentId,
          title,
          position,
          description,
          deadline,
          due_date: result.dueDate,
          due_at: result.dueAt,
          duration_minutes: result.durationMinutes,
          priority: result.priority ?? undefined, // sin reconocer: deja el default de la columna (4)
          recurrence_rule: result.recurrenceRule,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (labelIds.length > 0) {
        const { error: taskLabelsError } = await supabase
          .from("task_labels")
          .insert(labelIds.map((labelId) => ({ task_id: task.id, label_id: labelId, user_id: session.user.id })));
        if (taskLabelsError) throw taskLabelsError;
      }

      if (reminders && reminders.length > 0) {
        const { error: remindersError } = await supabase.from("reminders").insert(
          reminders.map((reminder) => ({
            user_id: session.user.id,
            task_id: task.id,
            remind_at: reminder.remind_at,
            offset_minutes: reminder.offset_minutes,
          })),
        );
        if (remindersError) throw remindersError;
      }

      return { taskId: task.id, finalProjectId: projectId, createdLabel: result.labels.some((l) => !l.id) };
    },
    onError: reportTaskError,
    onSettled: (data) => {
      if (data) queryClient.invalidateQueries({ queryKey: tasksQueryKey(data.finalProjectId) });
      queryClient.invalidateQueries({ queryKey: HOY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: COMPLETADO_QUERY_KEY });
      if (data?.createdLabel) queryClient.invalidateQueries({ queryKey: labelsQueryKey });
    },
  });
}
