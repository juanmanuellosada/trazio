"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

// El servidor no puede saber si ya montamos en el cliente: el snapshot de
// servidor siempre es "no montado", para que el primer render del cliente
// (hidratación) coincida con el del servidor. Recién después de hidratar
// React vuelve a pedir el snapshot y pasa a `true`.
function getServerSnapshot() {
  return false;
}

/**
 * `true` solo después de montar en el cliente. Mismo problema que resuelve
 * `useNavigatorOnline` (`hooks/use-navigator-online.ts`) para
 * `navigator.onLine`: acá lo que difiere entre servidor y cliente es el tema
 * resuelto por `next-themes` (`resolvedTheme`/`theme`), que en el cliente se
 * lee de `localStorage` de forma síncrona desde el primer render — antes de
 * montar, ese valor ya puede ser distinto del que asumió el servidor. Cada
 * lugar que decide qué pintar según el tema en el primer render (íconos,
 * colores de proyecto/etiqueta) tiene que esperar a `useMounted()` para leer
 * el tema real, y mientras tanto pintar algo estable.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
