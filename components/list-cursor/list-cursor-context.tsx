"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { useShortcutScope } from "@/lib/shortcuts/context";
import type { ShortcutCombo } from "@/lib/shortcuts/types";
import { useSelection } from "@/components/selection/selection-context";
import { useTaskDetail } from "@/components/tasks/task-detail-context";
import { cursorReducer, initialCursorState } from "@/lib/cursor/reducer";

type ListCursorContextValue = {
  cursorId: string | null;
  /** La fila señalada (D-A): tratamiento visual propio y habilita sus atajos (Enter/Espacio/X/.). */
  isCursor: (id: string) => boolean;
  /**
   * El único destino de `Tab` en la lista (D-A, "Tab entra a la lista en la
   * fila señalada"): el cursor si existe, si no la primera fila —así `Tab`
   * puede entrar a la lista aunque todavía no se haya movido nada (D-G, "no
   * hay cursor hasta que se presiona ↑/↓ o se hace clic"). Distinto de
   * `isCursor`: la primera fila es tab-stop sin ser, todavía, la señalada.
   */
  isTabStop: (id: string) => boolean;
  /** Clic en una fila, o el foco llegando a ella por cualquier vía (D-A: "el cursor es foco real"). */
  setCursor: (id: string) => void;
  registerRow: (id: string, node: HTMLElement | null) => void;
  /**
   * Bloquea el movimiento del cursor mientras el menú de una fila está
   * abierto (tarea 4.4): sin esto, `↑`/`↓` moverían el cursor de la lista
   * por debajo de un menú que los quiere para navegar sus propios ítems. Se
   * identifica por fila (no un booleano suelto) porque el menú puede
   * abrirse por clic derecho sobre una fila distinta de la señalada.
   */
  setRowMenuOpen: (id: string, open: boolean) => void;
};

const ListCursorContext = createContext<ListCursorContextValue | null>(null);

/** Teclas del cursor que no dependen de ninguna fila en particular (bloque 4.1): viven en un solo contexto, empujado una vez por pantalla. */
const CURSOR_SHORTCUTS = {
  abajo: { key: "ArrowDown" },
  arriba: { key: "ArrowUp" },
  inicio: { key: "Home" },
  fin: { key: "End" },
  extenderAbajo: { key: "ArrowDown", shift: true },
  extenderArriba: { key: "ArrowUp", shift: true },
} as const satisfies Record<string, ShortcutCombo>;

function sameIds(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

/**
 * Cursor de una lista (bloques 3-5, capacidad `cursor-de-lista`): cada
 * pantalla monta una instancia envolviendo su lista (junto a
 * `<SelectionProvider>`, del mismo modo que esa selección ya se resetea
 * sola al desmontar la pantalla — D-G, "un cursor por pantalla, y no
 * sobrevive a la navegación"). `orderedIds` es la lista aplanada en el
 * orden visual actual (`lib/cursor/flatten-visible-rows.ts` o, cuando ya
 * había un array equivalente para la selección, ese mismo) — la arma quien
 * llama, este componente no conoce la estructura (D-B).
 *
 * Wrapea `lib/cursor/reducer.ts` y le suma lo que ese reducer,
 * deliberadamente, no sabe: el foco real del navegador (D-A) y la
 * reconciliación automática cuando `orderedIds` cambia (D-C).
 */
export function ListCursorProvider({ children, orderedIds }: { children: ReactNode; orderedIds: string[] }) {
  const [state, dispatch] = useReducer(cursorReducer, initialCursorState);
  const selection = useSelection();
  const { openTaskId } = useTaskDetail();
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const previousOrderedIdsRef = useRef(orderedIds);
  const openMenuIdsRef = useRef(new Set<string>());
  const [anyRowMenuOpen, setAnyRowMenuOpen] = useState(false);

  // D-C: la lista cambió debajo del cursor (completar una tarea, un reorden
  // por realtime, un filtro) — reconciliar contra la posición anterior.
  useEffect(() => {
    const previous = previousOrderedIdsRef.current;
    if (!sameIds(previous, orderedIds)) {
      dispatch({ type: "reconcile", orderedIds, previousOrderedIds: previous });
    }
    previousOrderedIdsRef.current = orderedIds;
  }, [orderedIds]);

  // D-A: "moverse llama a `.focus()` real sobre el nodo de la fila". Cubre
  // también "clic en una fila" y "Tab entra a la fila señalada": cualquier
  // cambio de `cursorId`, sea cual sea su origen (`move`, `set` disparado
  // por clic o por el `onFocus` de la propia fila, o `reconcile`), termina
  // acá. El chequeo de `activeElement` evita un `.focus()` redundante
  // cuando el cambio de estado ya vino de un evento de foco real.
  useEffect(() => {
    if (state.cursorId == null) return;
    const node = nodesRef.current.get(state.cursorId);
    if (!node) return;
    if (document.activeElement !== node) node.focus();
    // Requirement "El cursor se mantiene visible al moverse": el foco ya
    // desplaza el scroll nativo en la mayoría de los casos, pero no
    // siempre es confiable dentro de un contenedor con su propio
    // `overflow-y-auto` (las seis pantallas). `scrollIntoView` con
    // `block: "nearest"` lo hace explícito sin saltar más de lo necesario
    // cuando la fila ya está total o parcialmente visible.
    node.scrollIntoView?.({ block: "nearest" });
  }, [state.cursorId]);

  const registerRow = useCallback((id: string, node: HTMLElement | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  const setRowMenuOpen = useCallback((id: string, open: boolean) => {
    const set = openMenuIdsRef.current;
    if (open) set.add(id);
    else set.delete(id);
    setAnyRowMenuOpen(set.size > 0);
  }, []);

  const setCursor = useCallback((id: string) => dispatch({ type: "set", id, orderedIds }), [orderedIds]);
  const isCursor = useCallback((id: string) => state.cursorId === id, [state.cursorId]);
  const isTabStop = useCallback(
    (id: string) => (state.cursorId ?? orderedIds[0] ?? null) === id,
    [state.cursorId, orderedIds],
  );

  // Con el detalle de una tarea o el menú de una fila abiertos, `↑`/`↓` no
  // le pertenecen a esta lista (tareas 4.4/4.5 y requirement "El detalle
  // abierto gana sobre el cursor"): la pila de contextos ya resuelve las
  // teclas que el detalle o el menú sí registran, pero ninguno de los dos
  // registra flechas, así que sin esto caerían igual hasta acá.
  const suspended = anyRowMenuOpen || openTaskId != null;

  useShortcutScope(
    [
      { combo: CURSOR_SHORTCUTS.abajo, handler: () => dispatch({ type: "move", direction: "down", orderedIds }) },
      { combo: CURSOR_SHORTCUTS.arriba, handler: () => dispatch({ type: "move", direction: "up", orderedIds }) },
      { combo: CURSOR_SHORTCUTS.inicio, handler: () => dispatch({ type: "move", direction: "first", orderedIds }) },
      { combo: CURSOR_SHORTCUTS.fin, handler: () => dispatch({ type: "move", direction: "last", orderedIds }) },
      {
        // D-E: `⇧↓` es "mover el cursor" + "`range` con el ancla que ya
        // existe" — nunca un ancla propia del teclado. El próximo id se
        // calcula con el reducer puro (sin despachar) porque `dispatch` es
        // asíncrono y el `range` de selección necesita el id de destino ya.
        combo: CURSOR_SHORTCUTS.extenderAbajo,
        handler: () => {
          const nextId = cursorReducer(state, { type: "move", direction: "down", orderedIds }).cursorId;
          dispatch({ type: "move", direction: "down", orderedIds });
          if (nextId) selection?.rangeSelect(nextId, orderedIds);
        },
      },
      {
        combo: CURSOR_SHORTCUTS.extenderArriba,
        handler: () => {
          const nextId = cursorReducer(state, { type: "move", direction: "up", orderedIds }).cursorId;
          dispatch({ type: "move", direction: "up", orderedIds });
          if (nextId) selection?.rangeSelect(nextId, orderedIds);
        },
      },
    ],
    { enabled: !suspended },
  );

  const value = useMemo<ListCursorContextValue>(
    () => ({ cursorId: state.cursorId, isCursor, isTabStop, setCursor, registerRow, setRowMenuOpen }),
    [state.cursorId, isCursor, isTabStop, setCursor, registerRow, setRowMenuOpen],
  );

  return <ListCursorContext.Provider value={value}>{children}</ListCursorContext.Provider>;
}

/** `null` fuera de un `<ListCursorProvider>` (panel, calendario, subtareas del detalle de tarea): sin cursor ahí, `TaskRow` degrada sola (D-G del design, "el cursor degrada solo"). */
export function useListCursor(): ListCursorContextValue | null {
  return useContext(ListCursorContext);
}
