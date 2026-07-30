"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { undoStackReducer } from "@/lib/undo/reducer";
import { isInsideTiptapEditor, isUndoShortcut } from "@/lib/undo/shortcut";
import type { UndoDescriptor, UndoEntry } from "@/lib/undo/types";

type UndoContextValue = {
  /** Empuja una acción deshacible a la pila (bloque 5.11) y devuelve su id, para poder sacarla puntualmente (bloque 5.12, ej. desde el botón del toast). */
  push: (descriptor: UndoDescriptor) => string;
  /** Deshace una entrada puntual por id y la saca de la pila (bloque 5.12: deshacer desde el toast no vuelve a deshacerse con `Ctrl/Cmd+Z`). */
  undoById: (id: string) => Promise<void>;
};

const UndoContext = createContext<UndoContextValue | null>(null);

/**
 * Pila de deshacer de la aplicación (D-F: contexto de React con
 * `useReducer`, en memoria, por sesión, sin librería de estado global —
 * D12). Además de exponer `push`/`undoById` a las mutaciones, este mismo
 * proveedor registra el único listener de `Ctrl/Cmd+Z` (bloque 5.9): en
 * fase de captura, para poder decidir antes que cualquier otro handler si
 * le cede el paso al historial propio de un editor Tiptap enfocado o si
 * deshace el tope de la pila.
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [stack, dispatch] = useReducer(undoStackReducer, [] as UndoEntry[]);
  const stackRef = useRef(stack);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const runUndo = useCallback(async (entry: UndoEntry) => {
    dispatch({ type: "remove", id: entry.id });
    await entry.undo();
  }, []);

  const push = useCallback((descriptor: UndoDescriptor) => {
    const id = crypto.randomUUID();
    dispatch({ type: "push", entry: { ...descriptor, id } });
    return id;
  }, []);

  const undoById = useCallback(
    async (id: string) => {
      const entry = stackRef.current.find((e) => e.id === id);
      if (entry) await runUndo(entry);
    },
    [runUndo],
  );

  const undoLast = useCallback(async () => {
    const entry = stackRef.current[stackRef.current.length - 1];
    if (entry) await runUndo(entry);
  }, [runUndo]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isUndoShortcut(event)) return;
      if (isInsideTiptapEditor(event.target)) return; // cede al historial propio de Tiptap
      event.preventDefault();
      void undoLast();
    }
    window.addEventListener("keydown", handleKeyDown, true); // fase de captura (D-G)
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [undoLast]);

  const value = useMemo(() => ({ push, undoById }), [push, undoById]);

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

export function useUndoStack(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndoStack se tiene que usar dentro de <UndoProvider>.");
  }
  return context;
}
