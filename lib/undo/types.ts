/**
 * Un descriptor de deshacer (D-F del design de `fase-2-potencia`): una
 * etiqueta en español para mostrar en el toast (bloque 5.12) y un thunk que
 * revierte la acción. Quien empuja el descriptor arma el thunk con lo que
 * ya tiene a mano (valores anteriores, snapshot) — la pila no sabe nada del
 * dominio, solo ejecuta.
 */
export type UndoDescriptor = {
  label: string;
  undo: () => Promise<void> | void;
};

export type UndoEntry = UndoDescriptor & { id: string };
