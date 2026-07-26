"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// El servidor no tiene `navigator`: el snapshot de servidor siempre es
// "conectado" para que el primer render del cliente (hidratación) coincida
// con el del servidor. La señal real de `navigator.onLine` recién se aplica
// después de hidratar, sin mismatch.
function getServerSnapshot() {
  return true;
}

/** Señal 1 de D4 (`lib/realtime/connectivity.ts`): `navigator.onLine`, sin polling. */
export function useNavigatorOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
