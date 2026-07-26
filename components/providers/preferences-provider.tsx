"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";

const PreferencesContext = createContext<UserPreferences | null>(null);

/**
 * Preferencias de fecha/hora sembradas desde el layout de la app privada
 * (Server Component): zona horaria, formato de fecha, formato de hora y
 * día de inicio de semana, disponibles en el cliente sin pasarlas a mano
 * por cada nivel de componentes hasta las filas de tarea que las necesitan
 * para formatear fechas (bloque 8.7).
 */
export function PreferencesProvider({ preferences, children }: { preferences: UserPreferences; children: ReactNode }) {
  return <PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>;
}

export function useUserPreferences(): UserPreferences {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("useUserPreferences se tiene que usar dentro de <PreferencesProvider>.");
  }
  return context;
}
