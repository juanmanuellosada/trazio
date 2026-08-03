import { describe, expect, it } from "vitest";
import { UNDATED_COLUMN_ID, UNSECTIONED_COLUMN_ID, dateColumns, priorityColumns, sectionColumns } from "./panel-columns";

type Task = { id: string; section_id: string | null; due_date: string | null; due_at: string | null; priority: number };

function task(overrides: Partial<Task> & { id: string }): Task {
  return { section_id: null, due_date: null, due_at: null, priority: 4, ...overrides };
}

const TIMEZONE = "America/Argentina/Buenos_Aires";

describe("sectionColumns (D-A: 'nada' y 'sección' son las mismas columnas en Bandeja y Proyecto)", () => {
  it("sin secciones, solo queda 'Sin sección' con todas las tareas", () => {
    const tasks = [task({ id: "a" }), task({ id: "b" })];
    const columns = sectionColumns(tasks, []);
    expect(columns).toEqual([{ id: UNSECTIONED_COLUMN_ID, label: "Sin sección", tasks }]);
  });

  it("una columna por sección, en el orden recibido, más 'Sin sección' primero", () => {
    const unsectioned = task({ id: "u" });
    const enCurso = task({ id: "a", section_id: "sec-1" });
    const bloqueado = task({ id: "b", section_id: "sec-2" });
    const columns = sectionColumns([enCurso, unsectioned, bloqueado], [
      { id: "sec-1", name: "En curso" },
      { id: "sec-2", name: "Bloqueado" },
    ]);

    expect(columns).toEqual([
      { id: UNSECTIONED_COLUMN_ID, label: "Sin sección", tasks: [unsectioned] },
      { id: "sec-1", label: "En curso", tasks: [enCurso] },
      { id: "sec-2", label: "Bloqueado", tasks: [bloqueado] },
    ]);
  });

  it("una sección sin tareas igual aparece como columna, vacía", () => {
    const columns = sectionColumns([], [{ id: "sec-1", name: "En curso" }]);
    expect(columns).toEqual([
      { id: UNSECTIONED_COLUMN_ID, label: "Sin sección", tasks: [] },
      { id: "sec-1", label: "En curso", tasks: [] },
    ]);
  });
});

describe("dateColumns (agrupar por fecha, cualquier pantalla)", () => {
  it("un día por cada fecha con tareas, en orden cronológico, más 'Sin fecha' al final", () => {
    const undated = task({ id: "u" });
    const day2 = task({ id: "b", due_date: "2026-08-05" });
    const day1 = task({ id: "a", due_date: "2026-08-03" });
    const columns = dateColumns([day2, undated, day1], TIMEZONE);

    expect(columns.map((c) => c.id)).toEqual(["2026-08-03", "2026-08-05", UNDATED_COLUMN_ID]);
    expect(columns[0].tasks).toEqual([day1]);
    expect(columns[1].tasks).toEqual([day2]);
    expect(columns[2].tasks).toEqual([undated]);
  });

  it("no genera un día que ninguna tarea tenga: solo los días con tareas, nunca una ventana completa", () => {
    const columns = dateColumns([task({ id: "a", due_date: "2026-08-03" })], TIMEZONE);
    expect(columns).toHaveLength(2); // el día con la tarea + "Sin fecha" (vacía)
    expect(columns[1]).toEqual({ id: UNDATED_COLUMN_ID, label: "Sin fecha", tasks: [] });
  });

  it("'Sin fecha' aparece igual sin ninguna tarea sin fecha: nunca cero columnas", () => {
    const columns = dateColumns([], TIMEZONE);
    expect(columns).toEqual([{ id: UNDATED_COLUMN_ID, label: "Sin fecha", tasks: [] }]);
  });

  it("una tarea con hora (due_at) cae en el día calendario de esa hora, en la zona del usuario", () => {
    // 2026-08-03T02:30:00Z es 2026-08-02 23:30 en America/Argentina/Buenos_Aires (UTC-3).
    const withTime = task({ id: "a", due_at: "2026-08-03T02:30:00.000Z" });
    const columns = dateColumns([withTime], TIMEZONE);
    expect(columns[0].id).toBe("2026-08-02");
  });

  it("el rótulo es la fecha en palabras, capitalizada", () => {
    const columns = dateColumns([task({ id: "a", due_date: "2026-08-03" })], TIMEZONE);
    expect(columns[0].label).toBe("Lunes 3 de agosto");
  });
});

describe("priorityColumns (agrupar por prioridad, cualquier pantalla)", () => {
  it("siempre las cuatro, en orden, aunque no haya ninguna tarea (nunca cero columnas)", () => {
    const columns = priorityColumns([]);
    expect(columns.map((c) => c.id)).toEqual(["1", "2", "3", "4"]);
    expect(columns.map((c) => c.label)).toEqual(["Urgente", "Alta", "Media", "Baja"]);
    expect(columns.every((c) => c.tasks.length === 0)).toBe(true);
  });

  it("cada tarea cae en la columna de su prioridad", () => {
    const urgente = task({ id: "a", priority: 1 });
    const baja = task({ id: "b", priority: 4 });
    const columns = priorityColumns([urgente, baja]);
    expect(columns.find((c) => c.id === "1")?.tasks).toEqual([urgente]);
    expect(columns.find((c) => c.id === "4")?.tasks).toEqual([baja]);
    expect(columns.find((c) => c.id === "2")?.tasks).toEqual([]);
  });
});
