import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { taskDueDay } from "@/lib/dates/today";
import { TASK_PRIORITIES, priorityLabel } from "@/lib/validation/tasks";

/**
 * Modelo de columnas del modo panel (grupo 1 de
 * `openspec/changes/panel-con-columnas-por-campo/tasks.md`, decisiones D-A,
 * D-B y D-C del design): puro, sin React ni consultas, para poder probar el
 * panel sin montar ninguna pantalla — hoy no hay una sola prueba del
 * tablero ni de las pantallas que lo montan (ver `proposal.md`, "Impact").
 *
 * Cubre únicamente los tres valores **explícitos** del agrupador (sección,
 * fecha, prioridad): "valen igual en cualquier pantalla" (proposal.md, "What
 * Changes"). El panel ya no ofrece "nada" (D48): cada pantalla tiene un
 * default propio —sección en Bandeja/Proyecto, fecha en Próximos, prioridad
 * en Hoy (`effectivePanelGroupBy`, `lib/view-options/schema.ts`)— y lo
 * resuelve el código propio de cada una. `sectionColumns` sirve también para
 * el default de Bandeja y Proyecto, porque ahí produce exactamente las
 * mismas columnas que "sección" explícito (ver el requirement "Sin agrupar,
 * un proyecto muestra sus secciones" en `specs/modo-panel`). Próximos
 * resuelve su propio default con la ventana de días configurada, que es
 * distinta de `dateColumns` (esta solo genera un día por cada uno que ya
 * tenga una tarea, no toda la ventana) — ese camino sigue sin tocarse.
 *
 * "Etiqueta" no está acá: el panel no la ofrece (D-B) y una preferencia
 * guardada en "etiqueta" se resuelve al default de la pantalla con
 * `effectivePanelGroupBy` (`lib/view-options/schema.ts`) antes de llegar a
 * este módulo.
 */

export type PanelColumn<T> = { id: string; label: string; tasks: T[] };

export type PanelSection = { id: string; name: string };

/** Columna fija para las tareas sin sección (mismo id que ya usa `SectionedTasks` hoy). */
export const UNSECTIONED_COLUMN_ID = "sin-seccion";

/** Columna fija para las tareas sin fecha (mismo id que ya usa `ProximosView` hoy). */
export const UNDATED_COLUMN_ID = "sin-fecha";

/**
 * Columnas por sección: "Sin sección" primero, después cada sección en el
 * orden recibido. Siempre al menos una columna ("Sin sección" nunca se
 * filtra, esté vacía o no) — el mismo criterio evita el tablero en blanco
 * que hoy afecta a prioridad (tarea 1.6).
 */
export function sectionColumns<T extends { section_id: string | null }>(
  tasks: T[],
  sections: PanelSection[],
): PanelColumn<T>[] {
  const tasksOfSection = (sectionId: string | null) => tasks.filter((t) => t.section_id === sectionId);
  return [
    { id: UNSECTIONED_COLUMN_ID, label: "Sin sección", tasks: tasksOfSection(null) },
    ...sections.map((section) => ({ id: section.id, label: section.name, tasks: tasksOfSection(section.id) })),
  ];
}

/** "Viernes 3 de octubre": mismo formato que ya usa `ProximosView` para los días fuera de hoy/mañana, sin ese acortamiento acá — esta columna no tiene una noción de "hoy" propia, la reutiliza cualquier pantalla. */
function dateColumnLabel(day: string): string {
  const label = format(parseISO(day), "EEEE d 'de' MMMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Columnas por fecha: un día por cada fecha de vencimiento que ya tenga
 * alguna tarea, en orden cronológico, más "Sin fecha" al final (siempre
 * presente, mismo criterio que "Sin sección"). A diferencia de "nada" en
 * Próximos, acá no se generan los días vacíos de una ventana: con tareas
 * repartidas en varios meses esto puede ser decenas de columnas — ver el
 * riesgo sin resolver en `design.md` ("Agrupar por fecha genera tantas
 * columnas como días con tareas"), todavía sin límite decidido.
 */
export function dateColumns<T extends { due_date: string | null; due_at: string | null }>(
  tasks: T[],
  timezone: string,
): PanelColumn<T>[] {
  const byDay = new Map<string, T[]>();
  const undated: T[] = [];
  for (const task of tasks) {
    const day = taskDueDay(task, timezone);
    if (day === null) {
      undated.push(task);
      continue;
    }
    const bucket = byDay.get(day);
    if (bucket) bucket.push(task);
    else byDay.set(day, [task]);
  }

  const dayColumns = [...byDay.keys()]
    .sort()
    .map((day) => ({ id: day, label: dateColumnLabel(day), tasks: byDay.get(day)! }));
  return [...dayColumns, { id: UNDATED_COLUMN_ID, label: "Sin fecha", tasks: undated }];
}

/** Columnas por prioridad: las cuatro, siempre, en su orden fijo (Urgente a Baja) — nunca se filtra una vacía. Es justamente lo que le falta hoy a Hoy: agrupando por prioridad sin tareas, el tablero queda en blanco porque las cuatro columnas se filtraban (tarea 1.6). */
export function priorityColumns<T extends { priority: number }>(tasks: T[]): PanelColumn<T>[] {
  return TASK_PRIORITIES.map((p) => ({
    id: String(p.value),
    label: priorityLabel(p.value),
    tasks: tasks.filter((t) => t.priority === p.value),
  }));
}
