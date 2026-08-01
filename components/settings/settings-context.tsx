"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** Las seis secciones del modal (bloque 9, sexta sección "Calendarios" en el bloque 7.4). Vive acá, no en `settings-modal.tsx`, para que quien abre el modal (p. ej. el banner de reconexión, bloque 7.7) pueda pedir una sección puntual sin importar el módulo del modal entero. */
export type SectionId = "cuenta" | "general" | "notificaciones" | "tema" | "instalacion" | "calendarios";

type SettingsContextValue = {
  isOpen: boolean;
  /** Sección con la que abrió la última vez (bloque 7.7): `null` si se abrió sin pedir una en particular, y el modal cae a su default ("cuenta"). */
  initialSection: SectionId | null;
  open: (section?: SectionId) => void;
  close: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Estado de "está abierta la configuración" (bloque 9), compartido por toda
 * la app privada: cualquier punto de entrada —el panel lateral, el banner
 * global de reconexión (bloque 7.7), o la ruta vieja `/configuracion` por
 * compatibilidad— abre el mismo modal sin navegar a una ruta separada (spec
 * de `configuracion`, "abre como una capa superpuesta, no como una pantalla
 * nueva"). Mismo patrón que `task-detail-context.tsx`. Vive en
 * `app/(app)/layout.tsx`, junto al resto de los providers del bloque 5.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialSection, setInitialSection] = useState<SectionId | null>(null);

  const value = useMemo<SettingsContextValue>(
    () => ({
      isOpen,
      initialSection,
      open: (section) => {
        setInitialSection(section ?? null);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [isOpen, initialSection],
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
