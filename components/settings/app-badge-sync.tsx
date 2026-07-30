"use client";

import { useAppBadge } from "@/lib/reminders/use-app-badge";

/**
 * Mantiene el badge del ícono de la aplicación al día (bloque 4.16). Sin
 * interfaz propia: se monta una única vez junto a `SettingsModal`, que ya
 * vive todo el tiempo en `app/(app)/layout.tsx` (abierto o cerrado) — así
 * el badge se actualiza durante toda la sesión, no solo con la
 * configuración abierta.
 */
export function AppBadgeSync() {
  useAppBadge();
  return null;
}
