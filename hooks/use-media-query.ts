"use client";

import { useEffect, useState } from "react";

/**
 * `true` cuando el media query matchea, reactivo a cambios de tamaño de
 * ventana. Empieza en `false` (SSR y primer render del cliente coinciden,
 * sin parpadeo) y se corrige apenas monta — lo usa el panel de detalle de
 * tarea (bloque 7.10) para decidir panel lateral vs. pantalla completa.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    // En el servidor no hay `matchMedia`, así que el primer render siempre
    // es `false`; corregirlo acá (después de montar) es la forma de no
    // romper la hidratación, igual que `app-sidebar.tsx` con `localStorage`.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario de arriba
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
