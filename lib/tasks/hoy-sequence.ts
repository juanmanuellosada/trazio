import { dayBoundsUtc, type TaskDueFields } from "@/lib/dates/today";

/**
 * Campos de un evento que necesita el orden de Hoy (grupo 2 de
 * `openspec/changes/hoy-con-eventos-y-formatos/tasks.md`, D-A del
 * `design.md`): nada más. `start`/`end` siguen la convención de Google que
 * ya documenta `lib/calendar/block.ts` — instante ISO con offset propio si
 * tiene hora, o `yyyy-MM-dd` si es de todo el día.
 */
export type HoySequenceEvent = {
  allDay: boolean;
  start: string;
};

export type HoySequenceEntry<TTask extends TaskDueFields, TEvent extends HoySequenceEvent> =
  | { kind: "event"; event: TEvent }
  | { kind: "task"; task: TTask };

/**
 * Funde tareas y eventos de Hoy en una sola secuencia ordenada (D-A):
 *
 * 1. Eventos de todo el día, y los que empezaron antes de hoy (arrastrados).
 * 2. Todo lo que tiene hora, eventos y tareas mezclados, por instante
 *    absoluto ascendente. Empate a la misma hora: primero el evento.
 * 3. Tareas sin hora, por `due_date` ascendente.
 *
 * "Empezó antes de hoy" se decide comparando el instante de inicio del
 * evento contra el instante de arranque del día de hoy en `timezone`
 * (`dayBoundsUtc`, ya usado por `hoy-filter.ts`) — nunca comparando texto
 * de hora ni el día calendario del propio evento, que puede traer una zona
 * horaria distinta a la del usuario. Es la misma razón por la que
 * `due_at` de una tarea se compara como instante y no como string.
 */
export function buildHoySequence<TTask extends TaskDueFields, TEvent extends HoySequenceEvent>(
  tasks: readonly TTask[],
  events: readonly TEvent[],
  now: Date,
  timezone: string,
): HoySequenceEntry<TTask, TEvent>[] {
  const { startUtc } = dayBoundsUtc(now, timezone);
  const todayStartMs = new Date(startUtc).getTime();

  const allDayEvents: TEvent[] = [];
  const carriedOverEvents: { event: TEvent; instant: number }[] = [];
  const timedEvents: { event: TEvent; instant: number }[] = [];

  for (const event of events) {
    if (event.allDay) {
      allDayEvents.push(event);
      continue;
    }
    const instant = new Date(event.start).getTime();
    if (instant < todayStartMs) {
      carriedOverEvents.push({ event, instant });
    } else {
      timedEvents.push({ event, instant });
    }
  }

  const timedTasks: { task: TTask; instant: number }[] = [];
  const undatedTasks: TTask[] = [];
  for (const task of tasks) {
    if (task.due_at) {
      timedTasks.push({ task, instant: new Date(task.due_at).getTime() });
    } else {
      undatedTasks.push(task);
    }
  }

  allDayEvents.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  carriedOverEvents.sort((a, b) => a.instant - b.instant);

  const tier1: HoySequenceEntry<TTask, TEvent>[] = [
    ...allDayEvents.map((event) => ({ kind: "event" as const, event })),
    ...carriedOverEvents.map(({ event }) => ({ kind: "event" as const, event })),
  ];

  const tier2Items: ({ instant: number } & ({ isEvent: true; event: TEvent } | { isEvent: false; task: TTask }))[] = [
    ...timedEvents.map(({ event, instant }) => ({ instant, isEvent: true as const, event })),
    ...timedTasks.map(({ task, instant }) => ({ instant, isEvent: false as const, task })),
  ];
  // Sort estable: a instante y tipo iguales, conserva el orden de llegada.
  tier2Items.sort((a, b) => (a.instant !== b.instant ? a.instant - b.instant : a.isEvent === b.isEvent ? 0 : a.isEvent ? -1 : 1));
  const tier2: HoySequenceEntry<TTask, TEvent>[] = tier2Items.map((item) =>
    item.isEvent ? { kind: "event", event: item.event } : { kind: "task", task: item.task },
  );

  const tier3: HoySequenceEntry<TTask, TEvent>[] = [...undatedTasks]
    .sort((a, b) => {
      const aDate = a.due_date ?? "";
      const bDate = b.due_date ?? "";
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
    })
    .map((task) => ({ kind: "task", task }));

  return [...tier1, ...tier2, ...tier3];
}

/**
 * Índice donde insertar la marca de "ahora" en una secuencia ya armada por
 * `buildHoySequence` (pedido del dueño, "en la vista Hoy en modo lista no sé
 * qué hora es actualmente"): recorre buscando el primer ítem cuyo instante
 * (`due_at` de una tarea, o `start` de un evento sin `allDay`) sea posterior
 * o igual a `now`, y devuelve ese índice — ahí va la marca, antes de ese
 * ítem. Si ninguno es posterior (todo lo del tramo con hora ya pasó), la
 * marca va justo después del último ítem con instante, es decir, antes del
 * tramo 3 (sin hora) si existe. `null` si ningún ítem de la secuencia tiene
 * instante comparable — sin eje temporal, no hay contra qué posicionarla.
 *
 * No hace falta distinguir acá el tramo 1 (todo el día / arrastrado de
 * ayer) del tramo 2 (con hora real hoy): un evento arrastrado, aunque
 * técnicamente tenga un instante de inicio, siempre es anterior a `now`
 * (empezó antes de hoy) — nunca es "el primer posterior", así que
 * participar del barrido no cambia el resultado.
 */
export function findNowMarkerIndex<TTask extends TaskDueFields, TEvent extends HoySequenceEvent>(
  sequence: readonly HoySequenceEntry<TTask, TEvent>[],
  now: Date,
): number | null {
  const nowMs = now.getTime();
  let lastComparableIndex = -1;

  for (let index = 0; index < sequence.length; index++) {
    const entry = sequence[index]!;
    const instant =
      entry.kind === "task"
        ? entry.task.due_at
          ? new Date(entry.task.due_at).getTime()
          : null
        : entry.event.allDay
          ? null
          : new Date(entry.event.start).getTime();
    if (instant === null) continue;
    if (instant >= nowMs) return index;
    lastComparableIndex = index;
  }

  return lastComparableIndex === -1 ? null : lastComparableIndex + 1;
}
