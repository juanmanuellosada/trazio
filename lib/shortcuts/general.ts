import type { ShortcutCombo } from "./types";

/**
 * Los tres atajos generales (bloque 7.4) que hoy vivían como literales
 * sueltos dentro de `resolveGeneral` en `shortcut-provider.tsx`. Se
 * extraen acá para que sean la única definición: el listener los consume
 * para disparar la acción, y el indicador de atajo (bloque 2, D-C) los
 * consume para dibujarse — ninguno de los dos escribe la tecla a mano.
 */
export const GENERAL_SHORTCUTS = {
  buscar: { key: "s" },
  agregarTarea: { key: "q" },
  agregarEvento: { key: "e" },
} as const satisfies Record<string, ShortcutCombo>;
