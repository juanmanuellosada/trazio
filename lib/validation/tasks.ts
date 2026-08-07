import { z } from "zod";

/**
 * Título de tarea (bloque 7): texto plano, sin markdown ni formato — ver el
 * requirement "Título de tarea en texto plano" del spec de `tareas`. Se
 * comparte entre el alta rápida (título únicamente) y el autoguardado del
 * título desde el detalle.
 */
export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Falta el título de la tarea. Escribí algo antes de continuar.")
  .max(500, "El título es muy largo: como máximo 500 caracteres.");

/** Prioridad de una tarea: `1` (Urgente) a `4` (Baja), default `4` (B4 del design). */
export const TASK_PRIORITIES = [
  { value: 1, label: "Urgente" },
  { value: 2, label: "Alta" },
  { value: 3, label: "Media" },
  { value: 4, label: "Baja" },
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];

export const DEFAULT_TASK_PRIORITY: TaskPriority = 4;

export function priorityLabel(priority: number): string {
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? "Baja";
}

/**
 * Hex de cada prioridad, para el bloque de tarea del calendario ("que las
 * tareas salgan del color de su prioridad", no del proyecto): mismo valor
 * que los tokens `--priority-*` de `app/globals.css` que ya usa `PriorityDot`
 * (`components/selectors/priority-select.tsx`), duplicado acá porque el
 * chip del calendario (`calendar-block-chip.tsx`) hace aritmética de alfa
 * sobre el color (`${color}1a` para el fondo), algo que no se puede hacer
 * sobre `var(--priority-x)`. A diferencia de `PROJECT_COLORS`
 * (`lib/validation/colors.ts`), el token vale lo mismo en los dos temas, así
 * que no hace falta un parámetro de tema acá. Si se retoca un tono en
 * `globals.css`, hay que actualizar este mapa a mano. Prioridad 4 (Baja) es
 * también el default (`DEFAULT_TASK_PRIORITY`) y el respaldo de un valor
 * fuera de rango.
 */
const TASK_PRIORITY_COLOR_HEX: Record<TaskPriority, string> = {
  1: "#EC1E2A",
  2: "#F58220",
  3: "#3B6FF0",
  4: "#8A94A0",
};

export function resolveTaskPriorityColorHex(priority: number): string {
  return TASK_PRIORITY_COLOR_HEX[priority as TaskPriority] ?? TASK_PRIORITY_COLOR_HEX[DEFAULT_TASK_PRIORITY];
}

/** Duración estimada en minutos: entero positivo, o vacío. */
export const durationMinutesSchema = z
  .number()
  .int()
  .positive("La duración tiene que ser mayor a cero.")
  .nullable();
