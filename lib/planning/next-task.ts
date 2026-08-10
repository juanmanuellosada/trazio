import type { Interval } from "./free-gaps";

/**
 * Selección de la tarea propuesta por "¿Qué hago ahora?" (D-D/D-E de
 * `openspec/changes/el-dia-que-entra/design.md`): cálculo puro, sobre
 * candidatas ya resueltas por el llamador — mismo principio que
 * `lib/planning/day-load.ts` y `lib/planning/free-gaps.ts`, vecinos de este
 * módulo. Las candidatas son exactamente el pool de "pedido sin lugar" de
 * `carga-del-dia` (pendientes, con duración, sin hora, de hoy o atrasadas):
 * solo tareas, nunca hábitos (no tienen prioridad ni `deadline` con qué
 * ordenarlos).
 */

/** Un hueco de menos de 5 minutos no cuenta como hueco (D-E): elegido, no medido, mismo espíritu que el margen de gracia de D58. */
const MIN_GAP_MINUTES = 5;

/** El primer hueco de `computeFreeGaps`, o `null` si no hay ninguno o el primero dura menos de `MIN_GAP_MINUTES`. */
export function nextAvailableGap(gaps: Interval[]): Interval | null {
  const first = gaps[0];
  if (!first) return null;
  const minutes = (first.end.getTime() - first.start.getTime()) / 60_000;
  return minutes >= MIN_GAP_MINUTES ? first : null;
}

export type NextTaskCandidate = {
  id: string;
  durationMinutes: number | null;
  /** `yyyy-MM-dd`, siempre presente en el pool de pedido sin lugar (vencen hoy o están atrasadas). */
  dueDate: string;
  /** Ya resuelto por el llamador (`isTaskOverdue`): si vence antes de hoy. */
  overdue: boolean;
  /** `yyyy-MM-dd` o `null`. */
  deadline: string | null;
  /** `1` (Urgente) a `4` (Baja) — `lib/validation/tasks.ts`. */
  priority: number;
  position: number;
};

/**
 * Orden de D-D, de más duro a más blando: atrasada primero (más vencida
 * primero entre atrasadas), después `deadline` más próximo (sin `deadline`
 * al final), después prioridad (menor número = más urgente), después
 * `position` como desempate final determinista.
 */
function compareCandidates(a: NextTaskCandidate, b: NextTaskCandidate): number {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
  if (a.overdue && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;

  if (a.deadline !== b.deadline) {
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return a.deadline < b.deadline ? -1 : 1;
  }

  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.position - b.position;
}

/**
 * La tarea que propone "¿Qué hago ahora?", o `null` si ninguna candidata
 * entra en el hueco (requisito duro de duración, D-D — distinto del caso
 * "no hay hueco", que ni siquiera llega a llamar a esta función).
 */
export function selectNextTask(candidates: NextTaskCandidate[], gapMinutes: number): NextTaskCandidate | null {
  const eligible = candidates.filter((c) => c.durationMinutes !== null && c.durationMinutes <= gapMinutes);
  if (eligible.length === 0) return null;
  return [...eligible].sort(compareCandidates)[0];
}
