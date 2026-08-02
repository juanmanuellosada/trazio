"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Campo a enfocar apenas se abre el detalle (bloque 7.8, capacidad
 * `atajos-de-teclado`; `deadline`/`reminders` sumados por
 * `menu-contextual-de-tarea`, D-B: esos dos ítems del menú de una tarea
 * delegan en su selector abriendo el detalle, a diferencia de fecha y
 * prioridad, que el menú resuelve sin abrir nada). `TaskDetailContent` lo
 * consume una sola vez al montar y lo limpia (`consumeFocusField`).
 */
export type TaskDetailFocusField = "date" | "priority" | "deadline" | "reminders";

type TaskDetailContextValue = {
  openTaskId: string | null;
  pendingFocusField: TaskDetailFocusField | null;
  open: (taskId: string, focusField?: TaskDetailFocusField) => void;
  close: () => void;
  consumeFocusField: () => TaskDetailFocusField | null;
};

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

/**
 * Clave del historial que marca una entrada agregada por el detalle
 * (bloque `detalle-en-el-historial`, D-A): el valor es el id de la tarea
 * que esa entrada representa. La dirección de la página no cambia — solo
 * el estado de la entrada.
 */
const HISTORY_KEY = "trazioTaskDetailId";

function historyTaskId(state: unknown): string | null {
  const value = (state as Record<string, unknown> | null)?.[HISTORY_KEY];
  return typeof value === "string" ? value : null;
}

/** Reescribe la entrada actual del historial sin la marca del detalle, sin mover la posición ni disparar `popstate`. */
function stripHistoryTaskId() {
  const rest: Record<string, unknown> = { ...(window.history.state as Record<string, unknown>) };
  delete rest[HISTORY_KEY];
  window.history.replaceState(rest, "", window.location.href);
}

/**
 * Estado de "qué tarea está abierta en el modal de detalle" (bloque 6,
 * antes panel lateral — D28), compartido por toda la app privada: cualquier
 * fila de tarea, en cualquier vista, puede abrir el mismo modal. Vive en el
 * layout de `app/(app)/`, junto al resto de los providers del bloque 5.
 *
 * Desde `detalle-en-el-historial` (D-A/D-B/D-C), abrir el detalle agrega una
 * entrada al historial en vez de vivir solo en memoria: así Atrás lo cierra
 * en vez de sacar al usuario de la aplicación, y encadenar aperturas (por
 * ejemplo, abrir una subtarea desde el detalle de su padre) sale gratis, sin
 * ninguna lógica especial — cada entrada guarda el id de la tarea que
 * corresponde mostrar al llegar a ella, y `onPopState` solo la lee.
 */
export function TaskDetailProvider({ children }: { children: ReactNode }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [pendingFocusField, setPendingFocusField] = useState<TaskDetailFocusField | null>(null);

  // Recargar con el detalle abierto (bloque 1.6, pregunta abierta del
  // diseño): como el detalle no está en la dirección, no se puede reabrir
  // tras recargar (`openTaskId` siempre arranca en `null`), y la entrada que
  // lo marcaba queda huérfana — apunta a una tarea que ya no se va a
  // mostrar. Se elige limpiar esa marca al montar, sin mover la posición en
  // el historial: así Atrás desde acá va directo a la página anterior real
  // en un solo paso, en vez de gastarse un paso en una entrada que no
  // representa nada (la alternativa descartada).
  useEffect(() => {
    if (historyTaskId(window.history.state) == null) return;
    stripHistoryTaskId();
  }, []);

  // Volver atrás — con el botón del navegador o con la flecha de adelante —
  // cae acá con el id que trae la entrada a la que se llega, sin importar
  // cuántas aperturas encadenadas haya: `null` cierra el detalle, cualquier
  // otro valor lo deja abierto en esa tarea (el caso de una subtarea que
  // vuelve a su padre no es un caso especial, D-B).
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      setOpenTaskId(historyTaskId(event.state));
      setPendingFocusField(null);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo<TaskDetailContextValue>(
    () => ({
      openTaskId,
      pendingFocusField,
      open: (taskId: string, focusField?: TaskDetailFocusField) => {
        window.history.pushState({ ...window.history.state, [HISTORY_KEY]: taskId }, "", window.location.href);
        setOpenTaskId(taskId);
        setPendingFocusField(focusField ?? null);
      },
      close: () => {
        // Cerrar por cualquier vía que no sea Atrás —la `X`, `Escape`, clic
        // afuera (D-C)— tiene que retroceder en el historial en vez de solo
        // apagar el panel: si no, cada apertura y cierre deja una entrada
        // muerta y Atrás termina sin ningún efecto visible. El cierre del
        // panel en sí pasa por `onPopState`, no por acá.
        //
        // Se quita la marca de la entrada actual antes de retroceder (sin
        // mover la posición): es un cierre a propósito, no un "volver", así
        // que esa entrada queda inerte en la pila de "adelante" — si el
        // usuario aprieta la flecha de adelante después, no vuelve a abrir
        // lo que acaba de cerrar (bloque 3.2).
        if (openTaskId != null) {
          stripHistoryTaskId();
          window.history.back();
          return;
        }
        setOpenTaskId(null);
      },
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
