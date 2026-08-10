import { PROJECT_COLOR_IDS } from "@/lib/validation/colors";

/**
 * Color determinístico por nombre para una etiqueta creada sin selector —
 * el `@` del alta rápida (`lib/parser/create-task-from-parse.ts`) o
 * `crear_tarea`/`crear` del servidor MCP (Ola 7 de `servidor-mcp`):
 * `labels.color` no admite `null` (B4/OQ1) y ninguno de los dos caminos
 * ofrece elegir un color. Determinístico (no random) para que crear
 * "@compras" dos veces en momentos distintos —si por lo que sea no
 * encontró la existente— caiga siempre en el mismo color, en vez de uno
 * distinto cada vez.
 */
export function colorForLabelName(name: string): (typeof PROJECT_COLOR_IDS)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_COLOR_IDS[hash % PROJECT_COLOR_IDS.length];
}
