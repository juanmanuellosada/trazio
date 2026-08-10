import type { Json } from "@/lib/supabase/database.types";

/**
 * Forma mínima de un documento de Tiptap: distingue "esto es un doc" de
 * "esto no lo es", que es lo único que le importa a este chequeo (D-E caso
 * 2 de `design.md`, `tasks.md` Ola 7 tarea 7.1) — no valida cada nodo
 * interno, eso ya lo hace Tiptap al leer.
 */
function isTiptapDocShape(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.type === "doc" && Array.isArray(record.content);
}

export type DescriptionValidation = { ok: true; value: Json | null } | { ok: false; error: string };

const DESCRIPTION_ERROR =
  'La descripción no es válida: tiene que ser un string, null, o un documento de Tiptap con la forma ' +
  '{"type": "doc", "content": [...]}.';

/**
 * Valida `description` antes de escribir (spec `mcp`, D-E caso 2 de
 * `design.md`): se probó insertando valores corruptos en `tasks.description`
 * y renderizando con el editor real. Un string plano **no** corrompe nada —
 * Tiptap lo interpreta como HTML al leerlo y lo renderiza bien, sin
 * conversión previa (matiz: por eso una descripción de varios párrafos
 * escrita como string queda en un solo párrafo, los saltos de línea se
 * colapsan al interpretarse como HTML — ver el comentario de cabecera de
 * `crear-tarea.ts` sobre por qué esta ola no lo corrige). `null` borra la
 * descripción. El riesgo real es un objeto que no sea un doc válido (lo que
 * un modelo que no ve el schema de Tiptap inventaría, ej. `{text: "..."}`):
 * ahí Tiptap no lanza excepción, la atrapa, escribe un `console.warn` que
 * nadie ve en producción y renderiza vacío — pérdida silenciosa del
 * contenido anterior. Por eso se rechaza acá, antes de escribir, en vez de
 * dejar que llegue a la base.
 */
export function validateDescription(value: unknown): DescriptionValidation {
  if (value === null) return { ok: true, value: null };
  if (typeof value === "string") return { ok: true, value };
  if (isTiptapDocShape(value)) return { ok: true, value: value as Json };
  return { ok: false, error: DESCRIPTION_ERROR };
}

/** Prosa compartida por `crear_tarea` y `editar` (tipo: tarea) para describir el parámetro `description` en su `inputSchema` — mismo texto, dicho una sola vez. */
export const DESCRIPTION_PARAM_DESCRIPTION =
  'Descripción de la tarea: un string se guarda tal cual, sin conversión (Tiptap lo interpreta como HTML ' +
  "al leerlo, así que los saltos de línea de un texto con varios párrafos se colapsan en uno), o un " +
  'documento de Tiptap {"type": "doc", "content": [...]}. Omitir o mandar null la deja vacía.';
