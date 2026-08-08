/**
 * Estado puro del cursor de lista (bloque 1, capacidad `cursor-de-lista`): a
 * lo sumo una fila señalada a la vez. Mismo estilo que
 * `lib/selection/reducer.ts` — sin DOM, sin foco real, eso lo cablea el
 * bloque 3 sobre este estado.
 *
 * Todas las acciones reciben `orderedIds`: la lista aplanada en el orden
 * visual actual (ver `lib/cursor/flatten-visible-rows.ts`), que arma la
 * pantalla porque es la única que sabe cómo quedó agrupada, ordenada y qué
 * está colapsado (design.md, D-B).
 */
export type CursorState = {
  cursorId: string | null;
};

export const initialCursorState: CursorState = {
  cursorId: null,
};

export type CursorAction =
  | { type: "move"; direction: "up" | "down" | "first" | "last"; orderedIds: string[] }
  | { type: "set"; id: string; orderedIds: string[] }
  | { type: "clear"; orderedIds: string[] }
  | { type: "reconcile"; orderedIds: string[]; previousOrderedIds: string[] };

/**
 * `move`: sin cursor todavía, `↓` entra por la primera fila y `↑` por la
 * última (requirement "La flecha abajo señala la primera fila"; `↑` es
 * simétrico, sin scenario propio). Con cursor, `↑`/`↓` avanzan una posición
 * y **no dan la vuelta** en los extremos (requirement "El cursor no da la
 * vuelta", 1.3): en la primera fila `↑` y en la última `↓` no hacen nada.
 * `first`/`last` van directo a los extremos sin mirar la posición actual.
 *
 * `set`: clic en una fila. Solo mueve el cursor si `id` sigue en
 * `orderedIds` — una fila que ya no está en la lista no puede señalarse.
 *
 * `clear`: sin cursor, como al entrar a la pantalla o al confirmar
 * `Escape` (`orderedIds` no participa del cálculo, pero se recibe para que
 * todas las acciones compartan la misma forma).
 *
 * `reconcile`: la regla de D-C, para cuando la lista cambia debajo del
 * cursor (completar una tarea, un reorden por realtime, un filtro). Recibe
 * la lista aplanada de **antes** del cambio además de la de ahora, porque
 * es la única forma de saber "la posición que tenía" cuando el id
 * desapareció:
 *
 * 1. Si `cursorId` sigue en `orderedIds`, no se mueve — aunque haya
 *    cambiado de posición (esto es lo que permite reordenar sin arrastrar
 *    el cursor a otro lado).
 * 2. Si desapareció, va al id que ahora ocupa esa misma posición; si la
 *    lista se acortó, al último. Es lo que deja completar varias tareas
 *    seguidas con `Espacio` sin perder el lugar.
 * 3. Si la lista quedó vacía, no hay cursor.
 */
export function cursorReducer(state: CursorState, action: CursorAction): CursorState {
  switch (action.type) {
    case "move": {
      const { direction, orderedIds } = action;
      if (orderedIds.length === 0) return { cursorId: null };

      if (direction === "first") return { cursorId: orderedIds[0] };
      if (direction === "last") return { cursorId: orderedIds[orderedIds.length - 1] };

      const currentIndex = state.cursorId !== null ? orderedIds.indexOf(state.cursorId) : -1;
      if (currentIndex === -1) {
        return { cursorId: direction === "down" ? orderedIds[0] : orderedIds[orderedIds.length - 1] };
      }

      if (direction === "down") {
        const nextIndex = Math.min(currentIndex + 1, orderedIds.length - 1);
        return { cursorId: orderedIds[nextIndex] };
      }
      const nextIndex = Math.max(currentIndex - 1, 0);
      return { cursorId: orderedIds[nextIndex] };
    }

    case "set": {
      if (!action.orderedIds.includes(action.id)) return state;
      return { cursorId: action.id };
    }

    case "clear":
      return { cursorId: null };

    case "reconcile": {
      const { orderedIds, previousOrderedIds } = action;
      if (state.cursorId === null) return state;
      if (orderedIds.includes(state.cursorId)) return state;
      if (orderedIds.length === 0) return { cursorId: null };

      const previousIndex = previousOrderedIds.indexOf(state.cursorId);
      if (previousIndex === -1) return { cursorId: null };

      const targetIndex = Math.min(previousIndex, orderedIds.length - 1);
      return { cursorId: orderedIds[targetIndex] };
    }

    default:
      return state;
  }
}
