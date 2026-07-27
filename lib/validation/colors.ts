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
 * `icon`, también nulo), un id de `PROJECT_COLORS` o un color personalizado
 * en formato hexadecimal (`#RRGGBB`, D29) para el resto. `labels.color` no
 * tiene esta excepción: siempre es un id de la paleta, así que indexar
 * `PROJECT_COLORS[label.color]` directamente ahí sigue siendo correcto (ver
 * `components/tasks/label-picker.tsx` y `task-row.tsx`).
 *
 * Esta es la única función que debe resolver un `projects.color` de la base a
 * un hex: nunca indexar `PROJECT_COLORS[projects.color]` a mano, porque rompe
 * con `undefined` para la Bandeja. Nunca tira: `null` resuelve al azul de
 * marca, un color personalizado válido se devuelve tal cual (mismo hex en
 * los dos temas: ya pasó la validación de contraste contra los dos antes de
 * guardarse, así que no hace falta una variante por tema), y cualquier otro
 * valor que no sea ninguna de las dos cosas cae al gris neutro de
 * `--text-secondary` (`docs/design-system.md`).
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
  if (isValidProjectHexColor(color)) {
    return color;
  }
  return FALLBACK_GRAY[theme];
}

/**
 * Color personalizado de proyecto (D29): una salida al final de la paleta
 * fija de D19, con el mismo formato hexadecimal de seis dígitos que ya
 * amplía el check constraint de `projects.color` (ver la migración de este
 * bloque). El formato es necesario pero no suficiente: `hasSufficientProjectColorContrast`
 * es lo que de verdad protege D19.
 */
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidProjectHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/**
 * Fondos de superficie de los dos temas (docs/design-system.md §7,
 * `--surface`): contra los que se valida el contraste de un color
 * personalizado. Van hardcodeados y no importados del CSS porque esta misma
 * validación corre en el esquema de Zod, sin DOM.
 */
export const PROJECT_SURFACE_HEX = { light: "#F7F8FA", dark: "#1A2436" } as const;

/**
 * Piso de contraste exigido a un color personalizado (D29): el mismo 3:1 con
 * el que ya se verificó toda la paleta fija (docs/design-system.md §2) — el
 * mínimo AA para contenido no textual (un swatch, un punto, un fondo de
 * chip), nunca texto de párrafo.
 */
export const MIN_PROJECT_COLOR_CONTRAST = 3;

function srgbChannelToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** Contraste WCAG entre dos colores hexadecimales (fórmula estándar, no una estimación). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * true si `hex` se lee sobre el fondo de superficie de los DOS temas a la
 * vez (D29): rechaza cualquier color que no alcance el mínimo en cualquiera
 * de los dos, no solo en el que se esté mirando al elegirlo.
 */
export function hasSufficientProjectColorContrast(hex: string): boolean {
  return (
    contrastRatio(hex, PROJECT_SURFACE_HEX.light) >= MIN_PROJECT_COLOR_CONTRAST &&
    contrastRatio(hex, PROJECT_SURFACE_HEX.dark) >= MIN_PROJECT_COLOR_CONTRAST
  );
}
