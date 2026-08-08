"use client";

import { usePendingTodaySync } from "@/lib/pending-count/use-pending-today-sync";

/**
 * Mantiene al día el badge del ícono de la aplicación y el `(N) ` del
 * título del documento (bloque 4.16, ampliado por el cambio
 * `pendientes-en-el-icono-y-el-titulo`). Sin interfaz propia: se monta una
 * única vez junto a `SettingsModal`, que ya vive todo el tiempo en
 * `app/(app)/layout.tsx` (abierto o cerrado) — así las dos superficies se
 * actualizan durante toda la sesión, no solo con la configuración abierta.
 */
export function AppBadgeSync() {
  usePendingTodaySync();
  return null;
}
