import { describe, expect, it } from "vitest";
import { buildHoySequence, findNowMarkerIndex, type HoySequenceEvent } from "./hoy-sequence";

const BA = "America/Argentina/Buenos_Aires";

// "Ahora" cae dentro del 03/08 en BA (2026-08-03T00:00:00-03:00 == 2026-08-03T03:00:00Z
// es el arranque de "hoy" que usa `dayBoundsUtc`).
const NOW = new Date("2026-08-03T15:00:00.000Z");

type Task = { id: string; due_date: string | null; due_at: string | null };
type Event = HoySequenceEvent & { id: string };

function task(id: string, fields: { due_date?: string | null; due_at?: string | null }): Task {
  return { id, due_date: fields.due_date ?? null, due_at: fields.due_at ?? null };
}

function event(id: string, fields: { allDay?: boolean; start: string }): Event {
  return { id, allDay: fields.allDay ?? false, start: fields.start };
}

function ids(sequence: ReturnType<typeof buildHoySequence<Task, Event>>): string[] {
  return sequence.map((entry) => (entry.kind === "task" ? entry.task.id : entry.event.id));
}

describe("buildHoySequence — tres tramos (D-A)", () => {
  it("un evento que empezó ayer y sigue hoy va al primer tramo, no según su hora de inicio", () => {
    // Empezó 02/08 23:30 en BA => instante 03/08 02:30Z, antes del arranque de hoy (03:00Z).
    const yesterday = event("carried-over", { start: "2026-08-02T23:30:00-03:00" });
    const sequence = buildHoySequence([], [yesterday], NOW, BA);
    expect(ids(sequence)).toEqual(["carried-over"]);
  });

  it("un evento que empieza hoy y sigue mañana se ordena por su hora de hoy, no va al primer tramo", () => {
    const spansIntoTomorrow = event("spans-tomorrow", { start: "2026-08-03T20:00:00-03:00" });
    const t = task("undated", {});
    const sequence = buildHoySequence([t], [spansIntoTomorrow], NOW, BA);
    // Con hora (tramo 2) antes que sin hora (tramo 3): el evento va primero.
    expect(ids(sequence)).toEqual(["spans-tomorrow", "undated"]);
  });

  it("un evento de todo el día va al primer tramo", () => {
    const allDay = event("holiday", { allDay: true, start: "2026-08-03" });
    const timed = task("with-hour", { due_at: "2026-08-03T18:00:00.000Z" });
    const sequence = buildHoySequence([timed], [allDay], NOW, BA);
    expect(ids(sequence)).toEqual(["holiday", "with-hour"]);
  });

  it("empate a la misma hora: primero el evento", () => {
    const sameInstant = "2026-08-03T14:00:00.000Z";
    const meeting = event("meeting", { start: sameInstant });
    const t = task("pay-rent", { due_at: sameInstant });
    const sequence = buildHoySequence([t], [meeting], NOW, BA);
    expect(ids(sequence)).toEqual(["meeting", "pay-rent"]);
  });

  it("lista sin eventos: solo tareas, con hora antes que sin hora", () => {
    const withHour = task("with-hour", { due_at: "2026-08-03T18:00:00.000Z" });
    const withoutHour = task("without-hour", { due_date: "2026-08-03" });
    const sequence = buildHoySequence([withoutHour, withHour], [], NOW, BA);
    expect(ids(sequence)).toEqual(["with-hour", "without-hour"]);
  });

  it("lista sin tareas: solo eventos, todo el día antes que con hora", () => {
    const allDay = event("holiday", { allDay: true, start: "2026-08-03" });
    const timed = event("meeting", { start: "2026-08-03T18:00:00.000Z" });
    const sequence = buildHoySequence([], [timed, allDay], NOW, BA);
    expect(ids(sequence)).toEqual(["holiday", "meeting"]);
  });

  it("compara instantes absolutos, nunca texto de hora: una tarea y un evento en zonas horarias distintas", () => {
    // Tarea: 09:00 en +02:00 => 07:00Z (más temprano en instante absoluto).
    const earlyTask = task("early-task", { due_at: "2026-08-03T09:00:00+02:00" });
    // Evento: 08:00 en -03:00 => 11:00Z (más tarde en instante absoluto).
    // Comparar el texto de la hora ("08:00" < "09:00") daría el orden opuesto al correcto.
    const laterEvent = event("later-event", { start: "2026-08-03T08:00:00-03:00" });
    const sequence = buildHoySequence([earlyTask], [laterEvent], NOW, BA);
    expect(ids(sequence)).toEqual(["early-task", "later-event"]);
  });

  it("una lista mezclada de verdad: todo el día, arrastrado de ayer, con hora y sin hora", () => {
    const allDay = event("holiday", { allDay: true, start: "2026-08-03" });
    const yesterday = event("carried-over", { start: "2026-08-02T23:30:00-03:00" });
    const morningMeeting = event("morning-meeting", { start: "2026-08-03T11:00:00.000Z" }); // 08:00 BA
    const payRent = task("pay-rent", { due_at: "2026-08-03T09:00:00.000Z" }); // 06:00 BA
    const undated = task("call-accountant", { due_date: "2026-08-03" });
    const sequence = buildHoySequence([payRent, undated], [morningMeeting, allDay, yesterday], NOW, BA);
    expect(ids(sequence)).toEqual(["holiday", "carried-over", "pay-rent", "morning-meeting", "call-accountant"]);
  });
});

// Marca de "ahora" en la vista Hoy modo lista (pedido "no sé qué hora es
// actualmente. Para tener referencia"): dónde cae dentro de la secuencia ya
// armada por `buildHoySequence`, sin volver a decidir qué es tier1/2/3.
describe("findNowMarkerIndex — dónde insertar la marca de \"ahora\"", () => {
  it("ahora cae entre dos ítems con hora: apunta al primero posterior", () => {
    const before = task("before", { due_at: "2026-08-03T12:00:00.000Z" }); // antes de NOW (15:00Z)
    const after = task("after", { due_at: "2026-08-03T18:00:00.000Z" }); // después de NOW
    const sequence = buildHoySequence([before, after], [], NOW, BA);
    const index = findNowMarkerIndex(sequence, NOW);
    expect(index).toBe(1);
    expect(sequence[index!]).toEqual({ kind: "task", task: after });
  });

  it("ningún ítem con hora (tramo con hora vacío): null, aunque haya todo el día y sin hora", () => {
    const allDay = event("holiday", { allDay: true, start: "2026-08-03" });
    const undated = task("undated", { due_date: "2026-08-03" });
    const sequence = buildHoySequence([undated], [allDay], NOW, BA);
    expect(findNowMarkerIndex(sequence, NOW)).toBeNull();
  });

  it("ahora antes del primer ítem con hora: la marca va al principio del tramo con hora, después del de todo el día", () => {
    const allDay = event("holiday", { allDay: true, start: "2026-08-03" });
    const later = task("later", { due_at: "2026-08-03T18:00:00.000Z" });
    const sequence = buildHoySequence([later], [allDay], NOW, BA);
    const index = findNowMarkerIndex(sequence, NOW);
    expect(index).toBe(1); // 0: holiday (todo el día), 1: later (con hora) — la marca cae justo acá.
    expect(sequence[index!]).toEqual({ kind: "task", task: later });
  });

  it("ahora después del último ítem con hora: la marca va justo antes del tramo sin hora", () => {
    const earlier = task("earlier", { due_at: "2026-08-03T12:00:00.000Z" });
    const undated = task("undated", { due_date: "2026-08-03" });
    const sequence = buildHoySequence([earlier, undated], [], NOW, BA);
    const index = findNowMarkerIndex(sequence, NOW);
    expect(index).toBe(1); // 0: earlier (con hora), 1: undated (sin hora) — la marca cae justo acá.
    expect(sequence[index!]).toEqual({ kind: "task", task: undated });
  });

  it("secuencia vacía: null, sin asumir que siempre hay al menos un ítem", () => {
    expect(findNowMarkerIndex(buildHoySequence([], [], NOW, BA), NOW)).toBeNull();
  });

  it("un evento arrastrado de ayer no rompe la posición aunque tenga instante comparable", () => {
    const yesterday = event("carried-over", { start: "2026-08-02T23:30:00-03:00" });
    const earlier = task("earlier", { due_at: "2026-08-03T09:00:00.000Z" });
    const later = task("later", { due_at: "2026-08-03T18:00:00.000Z" });
    const sequence = buildHoySequence([earlier, later], [yesterday], NOW, BA);
    expect(ids(sequence)).toEqual(["carried-over", "earlier", "later"]);
    const index = findNowMarkerIndex(sequence, NOW);
    expect(index).toBe(2); // justo antes de "later" — el arrastrado (tier1) no interfiere.
    expect(sequence[index!]).toEqual({ kind: "task", task: later });
  });
});
