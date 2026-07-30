/**
 * Estado puro de la selección múltiple (bloque 7.10, capacidad
 * `seleccion-multiple`): activo o no, el conjunto de ids seleccionados, y el
 * ancla del último clic simple (no de un `⇧clic`) para calcular el rango de
 * "Shift+clic selecciona un rango completo".
 */
export type SelectionState = {
  active: boolean;
  selected: ReadonlySet<string>;
  anchorId: string | null;
};

export const initialSelectionState: SelectionState = {
  active: false,
  selected: new Set(),
  anchorId: null,
};

export type SelectionAction =
  | { type: "toggle"; id: string }
  | { type: "range"; id: string; orderedIds: string[] }
  | { type: "selectAll"; ids: string[] }
  | { type: "clear" };

/**
 * `toggle`: clic simple en un casillero — activa el modo si estaba
 * inactivo (requirement "Un clic en el casillero de selección activa el
 * modo"), y sale solo cuando la selección llega a cero (requirement
 * "Deseleccionar la última tarea sale del modo automáticamente"). Cada clic
 * simple mueve el ancla para el próximo `⇧clic`.
 *
 * `range`: `⇧clic` (requirement "Selección de rango con Shift+clic") suma
 * (nunca reemplaza) las tareas entre el ancla y la tarea clickeada, en el
 * orden visual (`orderedIds`), inclusive ambos extremos. Sin ancla previa
 * (primer clic ya es un `⇧clic`, o el ancla ya no está en la lista actual),
 * se comporta como un `toggle` simple sobre esa tarea.
 */
export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "toggle": {
      const next = new Set(state.selected);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { active: next.size > 0, selected: next, anchorId: action.id };
    }

    case "range": {
      const fromIndex = state.anchorId ? action.orderedIds.indexOf(state.anchorId) : -1;
      const toIndex = action.orderedIds.indexOf(action.id);
      if (fromIndex === -1 || toIndex === -1) {
        return selectionReducer(state, { type: "toggle", id: action.id });
      }
      const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
      const next = new Set(state.selected);
      for (const id of action.orderedIds.slice(start, end + 1)) next.add(id);
      return { active: true, selected: next, anchorId: state.anchorId };
    }

    case "selectAll":
      return { active: action.ids.length > 0, selected: new Set(action.ids), anchorId: state.anchorId };

    case "clear":
      return initialSelectionState;

    default:
      return state;
  }
}
