import { describe, expect, it } from "vitest";
import { buildMiniMapCells, currentWeekProgress, MINI_MAP_DAYS } from "./habit-history";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano.
const NOW = new Date("2026-07-31T15:00:00.000Z"); // 2026-07-31 12:00 en TZ, viernes.

describe("buildMiniMapCells (tarea 3.5)", () => {
  it("devuelve 14 celdas, de la más vieja a hoy", () => {
    const cells = buildMiniMapCells("2026-01-01T00:00:00.000Z", [], TZ, NOW);
    expect(cells).toHaveLength(MINI_MAP_DAYS);
    expect(cells[0].date).toBe("2026-07-18");
    expect(cells[MINI_MAP_DAYS - 1].date).toBe("2026-07-31");
  });

  it("marca los días presentes en completedDates", () => {
    const cells = buildMiniMapCells("2026-01-01T00:00:00.000Z", ["2026-07-30", "2026-07-31"], TZ, NOW);
    const byDate = Object.fromEntries(cells.map((c) => [c.date, c.status]));
    expect(byDate["2026-07-30"]).toBe("marked");
    expect(byDate["2026-07-31"]).toBe("marked");
    expect(byDate["2026-07-29"]).toBe("unmarked");
  });

  it("distingue los días anteriores a la creación del hábito, aunque no estén marcados", () => {
    // Creado el 2026-07-28: los tres días previos de la ventana no deberían leerse como racha rota.
    const cells = buildMiniMapCells("2026-07-28T12:00:00.000Z", [], TZ, NOW);
    const byDate = Object.fromEntries(cells.map((c) => [c.date, c.status]));
    expect(byDate["2026-07-27"]).toBe("before-creation");
    expect(byDate["2026-07-28"]).toBe("unmarked");
  });

  // Tarea 6.2/spec "Un día salteado se distingue de uno sin hacer"
  // (calendario-legible-y-manipulable): sin `skippedDates` el comportamiento
  // es idéntico al de siempre (los tres tests de arriba no lo pasan y
  // siguen pasando), y con él un día salteado es su propio estado, no
  // "unmarked".
  it("distingue un día salteado de uno sin marcar", () => {
    const cells = buildMiniMapCells("2026-01-01T00:00:00.000Z", [], TZ, NOW, ["2026-07-30"]);
    const byDate = Object.fromEntries(cells.map((c) => [c.date, c.status]));
    expect(byDate["2026-07-30"]).toBe("skipped");
    expect(byDate["2026-07-29"]).toBe("unmarked");
  });

  it("si un día está marcado y salteado a la vez, marcado gana (mismo criterio que resolveHabitDayStatus)", () => {
    const cells = buildMiniMapCells("2026-01-01T00:00:00.000Z", ["2026-07-30"], TZ, NOW, ["2026-07-30"]);
    const byDate = Object.fromEntries(cells.map((c) => [c.date, c.status]));
    expect(byDate["2026-07-30"]).toBe("marked");
  });
});

describe("currentWeekProgress (tarea 3.6, D-D: semana lunes a domingo fija)", () => {
  it("cuenta solo las marcas de la semana en curso (lunes a hoy)", () => {
    // Semana en curso: lunes 2026-07-27 a domingo 2026-08-02. Hoy es viernes 2026-07-31.
    const dates = ["2026-07-25", "2026-07-27", "2026-07-29", "2026-07-31"];
    expect(currentWeekProgress(dates, TZ, NOW)).toBe(3);
  });

  it("da 0 sin marcas en la semana en curso", () => {
    expect(currentWeekProgress(["2026-07-20"], TZ, NOW)).toBe(0);
  });
});
