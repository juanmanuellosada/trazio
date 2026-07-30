import type { UndoEntry } from "./types";

/** Pila acotada a 20, en memoria (D-F, requirement "Pila de acciones acotada a 20"). */
export const UNDO_STACK_LIMIT = 20;

export type UndoStackState = UndoEntry[];

export type UndoStackAction = { type: "push"; entry: UndoEntry } | { type: "remove"; id: string };

/**
 * Reducer puro de la pila de deshacer (bloque 5.8): `push` agrega al tope y
 * descarta lo más viejo por encima del límite; `remove` saca una entrada
 * puntual, ya sea porque se deshizo desde el toast o desde `Ctrl/Cmd+Z`
 * (bloque 5.9/5.12) — nunca se deshace dos veces la misma acción.
 */
export function undoStackReducer(state: UndoStackState, action: UndoStackAction): UndoStackState {
  switch (action.type) {
    case "push":
      return [...state, action.entry].slice(-UNDO_STACK_LIMIT);
    case "remove":
      return state.filter((entry) => entry.id !== action.id);
    default:
      return state;
  }
}
