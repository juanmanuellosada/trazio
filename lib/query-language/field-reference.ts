import { QUERY_FIELDS, type QueryField } from "./ast";

/**
 * Fuente única de la ayuda de campos del lenguaje de consulta (capacidad
 * `filtros-guardados`, requirement "La pantalla de filtros explica el
 * lenguaje con ejemplos", D-E de `filtros-alcanzables`/design.md): de acá
 * derivan tanto el mensaje de "campo desconocido" de `parse.ts` como la
 * referencia visual del alta de filtro (`query-language-reference.tsx`).
 * Ninguno de los dos mantiene su propia lista de campos — la mantienen acá,
 * en el mismo orden que `QUERY_FIELDS`. El día que el lenguaje sume un
 * campo (`deadline`, sección, subproyectos), el chequeo de tipos de
 * `Record<QueryField, …>` obliga a agregar su entrada acá; una vez
 * agregada, aparece sola en los dos lugares que leen de acá.
 */
export type QueryFieldHelp = {
  field: QueryField;
  /** Nombre legible del campo, para la referencia visual. */
  label: string;
  /** Valores que acepta, en prosa breve. */
  values: string;
  /** Consulta de ejemplo que se inserta en el campo al tocarla. */
  example: string;
};

const FIELD_HELP: Record<QueryField, Omit<QueryFieldHelp, "field">> = {
  priority: { label: "Prioridad", values: "1 a 4, combinables con comas", example: "priority:1,2" },
  due: {
    label: "Vencimiento",
    values: "today, tomorrow, overdue, nodate, next7days, next30days, una fecha AAAA-MM-DD, due:before:FECHA o due:after:FECHA",
    example: "due:next7days",
  },
  label: { label: "Etiqueta", values: "nombre de una o varias etiquetas, separadas por coma", example: "label:trabajo" },
  project: { label: "Proyecto", values: "nombre de uno o varios proyectos, separados por coma", example: "project:personal" },
  completed: { label: "Completada", values: "true o false", example: "completed:false" },
  search: { label: "Texto", values: "texto a buscar en el título o la descripción", example: "search:informe" },
  recurring: { label: "Recurrente", values: "true o false", example: "recurring:true" },
  subtask: { label: "Subtarea", values: "true o false", example: "subtask:false" },
  created: {
    label: "Creada",
    values: "una fecha AAAA-MM-DD, created:before:FECHA o created:after:FECHA",
    example: "created:after:2026-01-01",
  },
  no_project: { label: "Sin proyecto", values: "true o false: tareas de la Bandeja de entrada", example: "no_project:true" },
};

/** Un renglón por campo, en el mismo orden que `QUERY_FIELDS`. */
export const QUERY_FIELD_REFERENCE: QueryFieldHelp[] = QUERY_FIELDS.map((field) => ({ field, ...FIELD_HELP[field] }));

/**
 * Operadores de combinación y agrupación (requirement "La pantalla de
 * filtros explica el lenguaje con ejemplos"): a diferencia de los campos,
 * son fijos —no salen de una gramática que vaya a crecer—, así que se
 * escriben acá directamente en vez de derivarlos de otra fuente.
 */
export const QUERY_OPERATOR_REFERENCE: { symbol: string; meaning: string }[] = [
  { symbol: "&", meaning: "y" },
  { symbol: "|", meaning: "o" },
  { symbol: "!", meaning: "no" },
  { symbol: "( )", meaning: "agrupa" },
];

/** Ejemplo tocable que combina campo, `&`, `!` y paréntesis a la vez (mismo ejemplo de `docs/product-spec.md`, sección 7). */
export const QUERY_COMBINED_EXAMPLE = "(priority:1,2 & due:next7days) & !label:espera";

/** La misma lista de campos, en prosa: "priority, due, … y no_project". La usa el error de "campo desconocido" de `parse.ts`. */
export function describeQueryFields(): string {
  const names = QUERY_FIELDS as readonly string[];
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
