"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type TaskDetailContextValue = {
  openTaskId: string | null;
  open: (taskId: string) => void;
  close: () => void;
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

  const value = useMemo<TaskDetailContextValue>(
    () => ({
      openTaskId,
      open: (taskId: string) => setOpenTaskId(taskId),
      close: () => setOpenTaskId(null),
    }),
    [openTaskId],
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
