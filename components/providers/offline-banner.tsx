"use client";

import { useConnectivity } from "./realtime-provider";

/**
 * 10.6: cartel persistente mientras la app está sin conexión (D4). Texto de
 * tres partes (`.claude/rules/copy.md`): qué pasó, por qué importa, qué
 * hacer. Vive fuera del límite `inert` de `OfflineBoundary` a propósito:
 * tiene que seguir legible aunque el resto de la interfaz esté bloqueado.
 */
export function OfflineBanner() {
  const { isOffline } = useConnectivity();
  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 border-b border-error/30 bg-error/10 px-4 py-2 text-center text-sm text-error"
    >
      Estás sin conexión. Trazio no puede guardar cambios sin internet: revisá tu conexión y volvé a intentar.
    </div>
  );
}
