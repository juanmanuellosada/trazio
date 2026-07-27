import type { ParseMatch } from "@/lib/parser/types";

type TokenAttr = ParseMatch["attr"];

/**
 * El sistema gráfico de la landing: cada tipo de token del parser toma uno
 * de los diez colores de proyecto de `docs/design-system.md` §2 (vía las
 * variables `--token-*` de `app/globals.css`), fijo en toda la página —
 * hero, demo, leyenda y galería. Es una asignación propia de esta página,
 * aparte de la paleta real de proyectos/etiquetas de la app
 * (`lib/validation/colors.ts`): acá los diez colores representan categorías
 * de sintaxis, no proyectos de un usuario.
 *
 * Las clases están escritas en literal (no armadas con template strings)
 * porque Tailwind extrae las utilidades escaneando el texto fuente: una
 * clase construida en runtime como `bg-token-${attr}` no aparecería en
 * ningún archivo como cadena completa y el compilador la descartaría.
 */
export const TOKEN_LABELS: Record<TokenAttr, string> = {
  date: "Fecha",
  hour: "Hora",
  duration: "Duración",
  recurrence: "Repetición",
  priority: "Prioridad",
  label: "Etiqueta",
  project: "Proyecto",
};

/** Fondo tenue + subrayado del color del token, sobre texto siempre en `text-foreground` (nunca el color del token como texto: los diez colores solo están verificados a 3:1, el mínimo no textual — `docs/design-system.md` §2). */
export const TOKEN_MARK_CLASS: Record<TokenAttr, string> = {
  date: "bg-token-date/15 decoration-token-date",
  hour: "bg-token-hour/15 decoration-token-hour",
  duration: "bg-token-duration/15 decoration-token-duration",
  recurrence: "bg-token-recurrence/15 decoration-token-recurrence",
  priority: "bg-token-priority/15 decoration-token-priority",
  label: "bg-token-label/15 decoration-token-label",
  project: "bg-token-project/15 decoration-token-project",
};

/** Punto de color sólido, para la leyenda y los chips secundarios de la galería. */
export const TOKEN_DOT_CLASS: Record<TokenAttr, string> = {
  date: "bg-token-date",
  hour: "bg-token-hour",
  duration: "bg-token-duration",
  recurrence: "bg-token-recurrence",
  priority: "bg-token-priority",
  label: "bg-token-label",
  project: "bg-token-project",
};

export const TOKEN_MARK_BASE_CLASS =
  "rounded-[3px] font-medium text-foreground underline decoration-2 underline-offset-2";
