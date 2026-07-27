/**
 * Paleta fija de colores de proyecto y etiqueta (docs/design-system.md §2).
 * No van como variables CSS: son datos de la aplicación, compartidos con el
 * check constraint de Postgres en `projects.color` y `labels.color`, y con
 * el enum de Zod que valida esos mismos campos.
 */
export const PROJECT_COLORS = {
  amarillo: { name: "Amarillo", light: "#B45309", dark: "#FBBF24" },
  lima: { name: "Lima", light: "#65A30D", dark: "#A3E635" },
  verde: { name: "Verde", light: "#059669", dark: "#34D399" },
  turquesa: { name: "Turquesa", light: "#0D9488", dark: "#2DD4BF" },
  celeste: { name: "Celeste", light: "#0284C7", dark: "#38BDF8" },
  indigo: { name: "Índigo", light: "#4F46E5", dark: "#818CF8" },
  violeta: { name: "Violeta", light: "#7C3AED", dark: "#A78BFA" },
  purpura: { name: "Púrpura", light: "#9333EA", dark: "#C084FC" },
  magenta: { name: "Magenta", light: "#C026D3", dark: "#E879F9" },
  marron: { name: "Marrón", light: "#78350F", dark: "#B08968" },
} as const;

export type ProjectColor = keyof typeof PROJECT_COLORS;

export const PROJECT_COLOR_IDS = Object.keys(PROJECT_COLORS) as [
  ProjectColor,
  ...ProjectColor[],
];

/**
 * `projects.color` es nulo para la Bandeja de entrada (mismo patrón que su
 * `icon`, también nulo) y un id de `PROJECT_COLORS` para el resto — ver D27
 * en `docs/decisions.md`. `labels.color` no tiene esta excepción: siempre es
 * un id de la paleta, así que indexar `PROJECT_COLORS[label.color]`
 * directamente ahí sigue siendo correcto (ver
 * `components/tasks/label-picker.tsx` y `task-row.tsx`).
 *
 * Esta es la única función que debe resolver un `projects.color` de la base a
 * un hex: nunca indexar `PROJECT_COLORS[projects.color]` a mano, porque rompe
 * con `undefined` para la Bandeja. Nunca tira: `null` resuelve al azul de
 * marca, y cualquier otro valor que no sea un id conocido cae al gris neutro
 * de `--text-secondary` (`docs/design-system.md`).
 */
const INBOX_BLUE_HEX = "#283B56";
const INBOX_BLUE_DARK_HEX = "#8CA3C9";
const FALLBACK_GRAY = { light: "#5C6675", dark: "#94A3B8" };

export function resolveProjectColorHex(color: string | null, theme: "light" | "dark"): string {
  if (color === null) {
    return theme === "dark" ? INBOX_BLUE_DARK_HEX : INBOX_BLUE_HEX;
  }
  if (color in PROJECT_COLORS) {
    return PROJECT_COLORS[color as ProjectColor][theme];
  }
  return FALLBACK_GRAY[theme];
}
