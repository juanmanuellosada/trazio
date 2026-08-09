import { z } from "zod";

/**
 * Los campos del lenguaje de consulta (spec `lenguaje-de-consulta`, D-A de
 * design.md): lista blanca única de la que salen tanto el parser
 * (`parse.ts`, que rechaza cualquier otro nombre) como la función Postgres
 * `buscar_tareas` (que vuelve a validar del lado del servidor, porque el
 * AST puede llegar de cualquier lado, no solo del parser del cliente).
 */
export const QUERY_FIELDS = [
  "priority",
  "due",
  "deadline",
  "label",
  "no_label",
  "project",
  "project_tree",
  "section",
  "completed",
  "search",
  "recurring",
  "subtask",
  "created",
  "no_project",
] as const;

export type QueryField = (typeof QUERY_FIELDS)[number];

export function isQueryField(value: string): value is QueryField {
  return (QUERY_FIELDS as readonly string[]).includes(value);
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que tener el formato AAAA-MM-DD.");

/** Palabras clave de `due` que no llevan fecha (D-A). `notime` es un valor más de este mismo espacio (D-D): fecha presente y hora ausente. */
export const DUE_KEYWORDS = ["today", "tomorrow", "overdue", "nodate", "notime", "next7days", "next30days"] as const;
export type DueKeyword = (typeof DUE_KEYWORDS)[number];

const dueConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("today") }),
  z.object({ kind: z.literal("tomorrow") }),
  z.object({ kind: z.literal("overdue") }),
  z.object({ kind: z.literal("nodate") }),
  z.object({ kind: z.literal("notime") }),
  z.object({ kind: z.literal("next7days") }),
  z.object({ kind: z.literal("next30days") }),
  z.object({ kind: z.literal("exact"), date: isoDateSchema }),
  z.object({ kind: z.literal("before"), date: isoDateSchema }),
  z.object({ kind: z.literal("after"), date: isoDateSchema }),
]);
export type DueCondition = z.infer<typeof dueConditionSchema>;

/**
 * Condición de `deadline` (D-A): mismo análisis de valores que `due`, salvo
 * `notime` — `deadline` es siempre una fecha sin hora (columna `date`, sin
 * un equivalente a `due_at`), así que la pregunta "¿tiene hora?" no aplica
 * (D-D la deja como valor exclusivo de `due`).
 */
const deadlineConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("today") }),
  z.object({ kind: z.literal("tomorrow") }),
  z.object({ kind: z.literal("overdue") }),
  z.object({ kind: z.literal("nodate") }),
  z.object({ kind: z.literal("next7days") }),
  z.object({ kind: z.literal("next30days") }),
  z.object({ kind: z.literal("exact"), date: isoDateSchema }),
  z.object({ kind: z.literal("before"), date: isoDateSchema }),
  z.object({ kind: z.literal("after"), date: isoDateSchema }),
]);
export type DeadlineCondition = z.infer<typeof deadlineConditionSchema>;

const createdConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("exact"), date: isoDateSchema }),
  z.object({ kind: z.literal("before"), date: isoDateSchema }),
  z.object({ kind: z.literal("after"), date: isoDateSchema }),
]);
export type CreatedCondition = z.infer<typeof createdConditionSchema>;

const priorityFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("priority"),
  values: z.array(z.number().int().min(1).max(4)).min(1),
});

const dueFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("due"),
  condition: dueConditionSchema,
});

const deadlineFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("deadline"),
  condition: deadlineConditionSchema,
});

const labelFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("label"),
  values: z.array(z.string().min(1)).min(1),
});

const noLabelFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("no_label"),
  value: z.boolean(),
});

const projectFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("project"),
  values: z.array(z.string().min(1)).min(1),
});

const projectTreeFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("project_tree"),
  values: z.array(z.string().min(1)).min(1),
});

const sectionFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("section"),
  values: z.array(z.string().min(1)).min(1),
});

const completedFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("completed"),
  value: z.boolean(),
});

const searchFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("search"),
  value: z.string().min(1),
});

const recurringFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("recurring"),
  value: z.boolean(),
});

const subtaskFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("subtask"),
  value: z.boolean(),
});

const createdFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("created"),
  condition: createdConditionSchema,
});

const noProjectFieldSchema = z.object({
  type: z.literal("field"),
  field: z.literal("no_project"),
  value: z.boolean(),
});

/**
 * Unión de los nodos de campo. No es un `z.discriminatedUnion` sobre
 * `field` porque zod exige que cada rama sea un objeto plano con el
 * discriminante — acá alcanza con `z.union`, que prueba cada rama y ya es
 * suficientemente barato para un AST de consulta (nunca tiene miles de
 * nodos).
 */
const fieldNodeSchema = z.union([
  priorityFieldSchema,
  dueFieldSchema,
  deadlineFieldSchema,
  labelFieldSchema,
  noLabelFieldSchema,
  projectFieldSchema,
  projectTreeFieldSchema,
  sectionFieldSchema,
  completedFieldSchema,
  searchFieldSchema,
  recurringFieldSchema,
  subtaskFieldSchema,
  createdFieldSchema,
  noProjectFieldSchema,
]);

export type FieldNode = z.infer<typeof fieldNodeSchema>;

export type AstNode =
  | FieldNode
  | { type: "not"; expr: AstNode }
  | { type: "and"; left: AstNode; right: AstNode }
  | { type: "or"; left: AstNode; right: AstNode };

/**
 * Esquema recursivo del AST (bloque 2.4): valida el árbol completo antes de
 * mandarlo a `buscar_tareas`. `!` y los grupos se representan como nodos
 * `not`/`and`/`or` sobre nodos de campo, precedencia `!` > `&` > `|` (D-A) ya
 * resuelta por el parser al construir el árbol.
 */
export const astNodeSchema: z.ZodType<AstNode> = z.lazy(() =>
  z.union([
    fieldNodeSchema,
    z.object({ type: z.literal("not"), expr: astNodeSchema }),
    z.object({ type: z.literal("and"), left: astNodeSchema, right: astNodeSchema }),
    z.object({ type: z.literal("or"), left: astNodeSchema, right: astNodeSchema }),
  ]),
);
