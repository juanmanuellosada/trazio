import { taskDueDay, type TaskDueFields } from "@/lib/dates/today";

/**
 * Orden por defecto de la página de una etiqueta (`specs/opciones-de-vista`,
 * compartido con Filtro): fecha de vencimiento ascendente, con las tareas
 * sin fecha al final, y a igualdad de fecha por prioridad descendente. A
 * diferencia de `compareUpcomingTasks`, acá no hay desempate por hora
 * dentro del día — el spec solo lo pide para Próximos.
 *
 * `timezone` resuelve a qué día calendario pertenece una tarea con `due_at`
 * (ver `taskDueDay`); sin eso, comparar el instante crudo movería tareas de
 * día según la hora en UTC en vez de la hora del usuario.
 */
export function compareLabelTasks(
  a: TaskDueFields & { priority: number },
  b: TaskDueFields & { priority: number },
  timezone: string,
): number {
  const dayA = taskDueDay(a, timezone);
  const dayB = taskDueDay(b, timezone);

  // Prioridad descendente (la más urgente primero): `1` es "Urgente" y `4`
  // es "Baja" (`lib/validation/tasks.ts`), así que "descendente" en
  // severidad es ascendente en el número guardado.
  if (dayA === null && dayB === null) return a.priority - b.priority;
  if (dayA === null) return 1;
  if (dayB === null) return -1;
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;

  return a.priority - b.priority;
}
