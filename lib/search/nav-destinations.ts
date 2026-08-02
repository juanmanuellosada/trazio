import { CalendarDays, CheckCircle2, Inbox, Repeat, Sun, Tag, type LucideIcon } from "lucide-react";
import { CHORD_KEY_BY_DESTINATION, CHORD_ROUTES, CHORD_TRIGGER_KEY, type ChordDestination } from "@/lib/shortcuts/chord";
import type { ShortcutCombo } from "@/lib/shortcuts/types";
import { normalize } from "@/lib/parser/normalize";

export type NavDestination = {
  id: ChordDestination;
  label: string;
  icon: LucideIcon;
  href: string;
  /** El acorde real (D-D): se arma acá con `CHORD_TRIGGER_KEY`/`CHORD_KEY_BY_DESTINATION`, nunca una tecla escrita a mano. */
  shortcut: [ShortcutCombo, ShortcutCombo];
};

function destination(id: ChordDestination, label: string, icon: LucideIcon): NavDestination {
  return {
    id,
    label,
    icon,
    href: CHORD_ROUTES[id] ?? "/",
    shortcut: [{ key: CHORD_TRIGGER_KEY }, { key: CHORD_KEY_BY_DESTINATION[id] }],
  };
}

/** Mismo orden y destinos que el panel lateral (`sidebar-content.tsx`). */
const NAV_DESTINATIONS: NavDestination[] = [
  destination("bandeja", "Bandeja de entrada", Inbox),
  destination("hoy", "Hoy", Sun),
  destination("proximos", "Próximos", CalendarDays),
  destination("etiquetas", "Etiquetas", Tag),
  destination("habitos", "Hábitos", Repeat),
  destination("completado", "Completado", CheckCircle2),
];

/**
 * Filtro del grupo "Ir a" (D-B): el mínimo de caracteres de la búsqueda de
 * tareas nunca aplica acá, así que una sola letra ya filtra.
 */
export function filterNavDestinations(term: string): NavDestination[] {
  const normalized = normalize(term.trim());
  if (!normalized) return NAV_DESTINATIONS;
  return NAV_DESTINATIONS.filter((d) => normalize(d.label).includes(normalized));
}
