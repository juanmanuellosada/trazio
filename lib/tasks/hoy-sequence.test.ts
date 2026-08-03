import { describe, expect, it } from "vitest";
import { buildHoySequence, type HoySequenceEvent } from "./hoy-sequence";

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
