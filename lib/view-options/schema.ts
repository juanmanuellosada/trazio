import { z } from "zod";
import { UPCOMING_WINDOW_DEFAULT_DAYS, UPCOMING_WINDOW_MAX_DAYS, UPCOMING_WINDOW_MIN_DAYS } from "@/lib/tasks/upcoming-filter";
import { CALENDAR_FORMATS, type CalendarFormat } from "@/lib/calendar/block";

/**
 * Esquema de `view_preferences.options` (bloque 6.1, D-H, spec
 * `opciones-de-vista`): una fila por pantalla, `view_key` es `bandeja`,
 * `hoy`, `proximos`, `proyecto:<id>`, `etiqueta:<id>` o `filtro:<id>`.
 *
 * Fase 4 (D-E del design): `viewShape` suma `"calendario"`, y con ella el
 * campo `formato_calendario` (día/cuatro días/semana/mes). Ese nombre —no
 * `calendarFormat`, distinto de la convención en inglés del resto de los
 * campos— es intencional: es la misma clave que ya usaba, como ejemplo de
 * clave desconocida, el test de fase 2 que verificaba el descarte (spec
 * `opciones-de-vista`, "Una clave desconocida en el jsonb se ignora"). Esa
 * clave pasa a ser válida en vez de cambiarle el nombre.
 */

export const VIEW_SHAPE_OPTIONS = ["lista", "panel", "calendario"] as const;
export type ViewShape = (typeof VIEW_SHAPE_OPTIONS)[number];

export const ORDER_OPTIONS = ["manual", "nombre", "fecha", "prioridad"] as const;
export type OrderOption = (typeof ORDER_OPTIONS)[number];

export const GROUP_BY_OPTIONS = ["nada", "seccion", "fecha", "prioridad", "etiqueta"] as const;
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
   * `showHabits` ya es un control visible desde la fase 3. Bloque 7.3:
   * `showFutureRecurrences` deja de estar reservado y se expone como
   * control, pero solo cuando `viewShape` es `"calendario"` (spec
   * `opciones-de-vista`).
   */
  showHabits: boolean;
  showFutureRecurrences: boolean;
  /** Formato de la forma de ver calendario (bloque 7.1): solo importa cuando `viewShape` es `"calendario"`, pero se guarda igual para el resto de las pantallas. */
  formato_calendario: CalendarFormat;
};

const viewShapeFieldSchema = z.enum(VIEW_SHAPE_OPTIONS);
const orderFieldSchema = z.enum(ORDER_OPTIONS);
const groupByFieldSchema = z.enum(GROUP_BY_OPTIONS);
const deadlineFilterFieldSchema = z.enum(DEADLINE_FILTER_OPTIONS);
const priorityFieldSchema = z.union([z.number().int().min(1).max(4), z.null()]);
const labelIdFieldSchema = z.union([z.string().min(1), z.null()]);
const daysAheadFieldSchema = z.number().int().min(UPCOMING_WINDOW_MIN_DAYS).max(UPCOMING_WINDOW_MAX_DAYS);
const booleanFieldSchema = z.boolean();
const calendarFormatFieldSchema = z.enum(CALENDAR_FORMATS);

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
    formato_calendario: "semana",
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
    formato_calendario: safeField(calendarFormatFieldSchema, obj.formato_calendario, defaults.formato_calendario),
  };
}

/** El arrastre entre columnas/filas solo está habilitado con orden manual y sin agrupación activa (D-I, bloque 6.10), la misma condición que ya rige el arrastre en modo lista. */
export function isDragEnabled(options: Pick<ViewOptions, "order" | "groupBy">): boolean {
  return options.order === "manual" && options.groupBy === "nada";
}

/**
 * El panel no ofrece agrupar por etiqueta (D-B, `openspec/changes/panel-con-columnas-por-campo`):
 * una tarea puede tener varias y aparecería repetida en varias columnas. El
 * agrupador es el mismo control y la misma preferencia guardada que la
 * lista, donde "etiqueta" sí vale — así que una preferencia guardada en
 * "etiqueta" NUNCA se pisa acá (quien llama sigue leyendo y escribiendo el
 * valor crudo tal cual): esta función solo resuelve qué grupo usar *dentro*
 * del panel, tratándolo como si fuera "nada".
 */
export function effectivePanelGroupBy(groupBy: GroupByOption): GroupByOption {
  return groupBy === "etiqueta" ? "nada" : groupBy;
}

/**
 * Espejo de `effectivePanelGroupBy` para la lista (bloque "hueco" de
 * `openspec/changes/panel-con-columnas-por-campo`): "sección" y "fecha" son
 * valores nuevos, pensados para las columnas del panel, y la lista no sabe
 * agruparlos — cada forma de ver ofrece lo que sabe manejar y trata lo que
 * no entiende como "nada", sin pisar la preferencia guardada. Quien llama
 * sigue leyendo y escribiendo el valor crudo tal cual; esta función solo
 * resuelve qué grupo usar *dentro* de la lista.
 */
export function effectiveListGroupBy(groupBy: GroupByOption): GroupByOption {
  return groupBy === "seccion" || groupBy === "fecha" ? "nada" : groupBy;
}
