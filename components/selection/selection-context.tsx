"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { useShortcutScope } from "@/lib/shortcuts/context";
import { initialSelectionState, selectionReducer } from "@/lib/selection/reducer";

type SelectionContextValue = {
  active: boolean;
  isSelected: (id: string) => boolean;
  count: number;
  toggle: (id: string) => void;
  rangeSelect: (id: string, orderedIds: string[]) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

/**
 * Modo de selección múltiple de una pantalla (bloque 7.10-7.13, capacidad
 * `seleccion-multiple`): cada una de las seis pantallas (Bandeja, Hoy,
 * Próximos, Proyecto, Etiqueta, Filtro) monta su propia instancia, así que
 * la selección de una no se filtra a la otra y se resetea sola al navegar
 * (se desmonta con la pantalla). `Escape` sale del modo — registrado acá
 * mismo como un contexto de atajos (bloque 7.1) activo solo mientras hay
 * selección, para no competir con el `Escape` que ya cierran los diálogos
 * y menús por su cuenta (Radix/Base UI) cuando no hay nada seleccionado.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, initialSelectionState);

  const toggle = useCallback((id: string) => dispatch({ type: "toggle", id }), []);
  const rangeSelect = useCallback((id: string, orderedIds: string[]) => dispatch({ type: "range", id, orderedIds }), []);
  const selectAll = useCallback((ids: string[]) => dispatch({ type: "selectAll", ids }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const isSelected = useCallback((id: string) => state.selected.has(id), [state.selected]);

  useShortcutScope([{ combo: { key: "Escape" }, handler: clear }], { enabled: state.active });

  const value = useMemo<SelectionContextValue>(
    () => ({ active: state.active, isSelected, count: state.selected.size, toggle, rangeSelect, selectAll, clear }),
    [state.active, state.selected.size, isSelected, toggle, rangeSelect, selectAll, clear],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/** `null` fuera de un `<SelectionProvider>` (ej. las subtareas del detalle de tarea): sin selección múltiple ahí, el casillero simplemente no se muestra. */
export function useSelection(): SelectionContextValue | null {
  return useContext(SelectionContext);
}
