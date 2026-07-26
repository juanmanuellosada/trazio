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

/** Duración estimada en minutos: entero positivo, o vacío. */
export const durationMinutesSchema = z
  .number()
  .int()
  .positive("La duración tiene que ser mayor a cero.")
  .nullable();
