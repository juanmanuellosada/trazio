"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Campo a enfocar apenas se abre el detalle (bloque 7.8, capacidad
 * `atajos-de-teclado`): el menú contextual de una tarea (`T`, `Y`) abre el
 * detalle y de una vez su selector de fecha o de prioridad, en vez de solo
 * abrir el detalle a secas. `TaskDetailContent` lo consume una sola vez al
 * montar y lo limpia (`consumeFocusField`).
 */
export type TaskDetailFocusField = "date" | "priority";

type TaskDetailContextValue = {
  openTaskId: string | null;
  pendingFocusField: TaskDetailFocusField | null;
  open: (taskId: string, focusField?: TaskDetailFocusField) => void;
  close: () => void;
  consumeFocusField: () => TaskDetailFocusField | null;
};

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

/**
 * Estado de "qué tarea está abierta en el modal de detalle" (bloque 6,
 * antes panel lateral — D28), compartido por toda la app privada: cualquier
 * fila de tarea, en cualquier vista, puede abrir el mismo modal. Vive en el
 * layout de `app/(app)/`, junto al resto de los providers del bloque 5.
 */
export function TaskDetailProvider({ children }: { children: ReactNode }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [pendingFocusField, setPendingFocusField] = useState<TaskDetailFocusField | null>(null);

  const value = useMemo<TaskDetailContextValue>(
    () => ({
      openTaskId,
      pendingFocusField,
      open: (taskId: string, focusField?: TaskDetailFocusField) => {
        setOpenTaskId(taskId);
        setPendingFocusField(focusField ?? null);
      },
      close: () => setOpenTaskId(null),
      consumeFocusField: () => {
        setPendingFocusField(null);
        return pendingFocusField;
      },
    }),
    [openTaskId, pendingFocusField],
  );

  return <TaskDetailContext.Provider value={value}>{children}</TaskDetailContext.Provider>;
}

export function useTaskDetail(): TaskDetailContextValue {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error("useTaskDetail se tiene que usar dentro de <TaskDetailProvider>.");
  }
  return context;
}
