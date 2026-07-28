"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SettingsContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Estado de "está abierta la configuración" (bloque 9), compartido por toda
 * la app privada: cualquier punto de entrada —el panel lateral, o la ruta
 * vieja `/configuracion` por compatibilidad— abre el mismo modal sin
 * navegar a una ruta separada (spec de `configuracion`, "abre como una capa
 * superpuesta, no como una pantalla nueva"). Mismo patrón que
 * `task-detail-context.tsx`. Vive en `app/(app)/layout.tsx`, junto al resto
 * de los providers del bloque 5.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<SettingsContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings se tiene que usar dentro de <SettingsProvider>.");
  }
  return context;
}
