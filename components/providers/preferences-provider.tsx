"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { setSoundOnCompleteEnabled } from "@/lib/completion-sound";

const PreferencesContext = createContext<UserPreferences | null>(null);

/**
 * Preferencias de fecha/hora sembradas desde el layout de la app privada
 * (Server Component): zona horaria, formato de fecha, formato de hora y
 * día de inicio de semana, disponibles en el cliente sin pasarlas a mano
 * por cada nivel de componentes hasta las filas de tarea que las necesitan
 * para formatear fechas (bloque 8.7).
 */
export function PreferencesProvider({ preferences, children }: { preferences: UserPreferences; children: ReactNode }) {
  // `sonido-al-completar`: `lib/tasks/mutations.ts`/`lib/habits/mutations.ts`
  // llaman a `playCompletionSound()` directo (sin hooks, para no atar la
  // mutación al árbol de componentes), así que el interruptor viaja acá,
  // el único lugar que ya recibe la preferencia recién sembrada por
  // `router.refresh()` (ver el comentario de `useUpdatePreferences`).
  useEffect(() => {
    setSoundOnCompleteEnabled(preferences.soundOnComplete ?? true);
  }, [preferences.soundOnComplete]);

  return <PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>;
}

export function useUserPreferences(): UserPreferences {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("useUserPreferences se tiene que usar dentro de <PreferencesProvider>.");
  }
  return context;
}
