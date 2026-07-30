import { z } from "zod";
import { UPCOMING_WINDOW_DEFAULT_DAYS, UPCOMING_WINDOW_MAX_DAYS, UPCOMING_WINDOW_MIN_DAYS } from "@/lib/tasks/upcoming-filter";

/**
 * Esquema de `view_preferences.options` (bloque 6.1, D-H, spec
 * `opciones-de-vista`): una fila por pantalla, `view_key` es `bandeja`,
 * `hoy`, `proximos`, `proyecto:<id>`, `etiqueta:<id>` o `filtro:<id>`. El
 * modo calendario no es un valor posible de `viewShape` en fase 2 (es fase
 * 4, D-I del design), así que ni siquiera se declara acá.
 */

export const VIEW_SHAPE_OPTIONS = ["lista", "panel"] as const;
export type ViewShape = (typeof VIEW_SHAPE_OPTIONS)[number];

export const ORDER_OPTIONS = ["manual", "nombre", "fecha", "prioridad"] as const;
export type OrderOption = (typeof ORDER_OPTIONS)[number];

export const GROUP_BY_OPTIONS = ["nada", "prioridad", "etiqueta"] as const;
export type GroupByOption = (typeof GROUP_BY_OPTIONS)[number];

export const DEADLINE_FILTER_OPTIONS = ["cualquiera", "con", "sin"] as const;
export type DeadlineFilterOption = (typeof DEADLINE_FILTER_OPTIONS)[number];

export type QuickFilters = {
  deadline: DeadlineFilterOption;
  priority: number | null;
  labelId: string | null;
};

const DEFAULT_QUICK_FILTERS: QuickFilters = { deadline: "cualquiera", priority: null, labelId: null };

export type ViewOptions = {
  viewShape: ViewShape;
  showCompleted: boolean;
  daysAhead: number;
  order: OrderOption;
  groupBy: GroupByOption;
  quickFilters: QuickFilters;
  /**
   * Reservado (bloque 6.4, requirement "Los controles de hábitos y
   * repeticiones futuras quedan reservados, sin exponerse"): existen en el
   * esquema como punto de extensión para las fases 3 y 4, pero la barra no
   * los muestra como controles en fase 2.
   */
  showHabits: boolean;
  showFutureRecurrences: boolean;
};

const viewShapeFieldSchema = z.enum(VIEW_SHAPE_OPTIONS);
const orderFieldSchema = z.enum(ORDER_OPTIONS);
const groupByFieldSchema = z.enum(GROUP_BY_OPTIONS);
const deadlineFilterFieldSchema = z.enum(DEADLINE_FILTER_OPTIONS);
const priorityFieldSchema = z.union([z.number().int().min(1).max(4), z.null()]);
const labelIdFieldSchema = z.union([z.string().min(1), z.null()]);
const daysAheadFieldSchema = z.number().int().min(UPCOMING_WINDOW_MIN_DAYS).max(UPCOMING_WINDOW_MAX_DAYS);
const booleanFieldSchema = z.boolean();

/** Bandeja y Proyecto: orden manual (D25). El resto: por fecha de vencimiento, que ya reproduce "por hora" en Hoy y el orden propio de Próximos, Etiqueta y Filtro (ver `docs/decisions.md` D25 y los requirements de defaults de `specs/opciones-de-vista`). */
export function defaultOptionsForViewKey(viewKey: string): ViewOptions {
  const isManualScreen = viewKey === "bandeja" || viewKey.startsWith("proyecto:");
  const showCompletedByDefault = viewKey !== "hoy" && viewKey !== "proximos";

  return {
    viewShape: "lista",
    showCompleted: showCompletedByDefault,
    daysAhead: UPCOMING_WINDOW_DEFAULT_DAYS,
    order: isManualScreen ? "manual" : "fecha",
    groupBy: "nada",
    quickFilters: { ...DEFAULT_QUICK_FILTERS },
    showHabits: true,
    showFutureRecurrences: false,
  };
}

/** Valor de un campo si es válido según su esquema, o el default si falta o no matchea (clave desconocida u otro campo corrompido no tira abajo el resto). */
function safeField<T>(schema: z.ZodType<T>, raw: unknown, fallback: T): T {
  const result = schema.safeParse(raw);
  return result.success ? result.data : fallback;
}

/**
 * Parsea el `jsonb` de una fila de `view_preferences` (bloque 6.1/6.2,
 * requirement "Una clave desconocida en el jsonb se ignora"): cualquier
 * clave ausente, inválida o desconocida se completa con el default de esa
 * `viewKey`, sin romper el resto de las opciones válidas.
 */
export function parseViewOptions(viewKey: string, raw: unknown): ViewOptions {
  const defaults = defaultOptionsForViewKey(viewKey);
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const quickFiltersRaw = obj.quickFilters && typeof obj.quickFilters === "object" ? (obj.quickFilters as Record<string, unknown>) : {};

  return {
    viewShape: safeField(viewShapeFieldSchema, obj.viewShape, defaults.viewShape),
    showCompleted: safeField(booleanFieldSchema, obj.showCompleted, defaults.showCompleted),
    daysAhead: safeField(daysAheadFieldSchema, obj.daysAhead, defaults.daysAhead),
    order: safeField(orderFieldSchema, obj.order, defaults.order),
    groupBy: safeField(groupByFieldSchema, obj.groupBy, defaults.groupBy),
    quickFilters: {
      deadline: safeField(deadlineFilterFieldSchema, quickFiltersRaw.deadline, defaults.quickFilters.deadline),
      priority: safeField(priorityFieldSchema, quickFiltersRaw.priority, defaults.quickFilters.priority),
      labelId: safeField(labelIdFieldSchema, quickFiltersRaw.labelId, defaults.quickFilters.labelId),
    },
    showHabits: safeField(booleanFieldSchema, obj.showHabits, defaults.showHabits),
    showFutureRecurrences: safeField(booleanFieldSchema, obj.showFutureRecurrences, defaults.showFutureRecurrences),
  };
}

/** El arrastre entre columnas/filas solo está habilitado con orden manual y sin agrupación activa (D-I, bloque 6.10), la misma condición que ya rige el arrastre en modo lista. */
export function isDragEnabled(options: Pick<ViewOptions, "order" | "groupBy">): boolean {
  return options.order === "manual" && options.groupBy === "nada";
}
