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
