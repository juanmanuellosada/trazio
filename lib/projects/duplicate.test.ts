import { describe, expect, it } from "vitest";
import { duplicateProject } from "./duplicate";

/**
 * Fake de `SupabaseClient` en memoria (mismo patrón que
 * `lib/tasks/restore.test.ts`), extendido con `.is()` y `.order()`: lo que
 * hace falta para ejercitar `duplicateProject` de punta a punta —
 * proyecto, secciones, tareas raíz vía `duplicateTaskTree` y etiquetas—
 * sobre un mapa de tablas en memoria, sin pegarle a una base real.
 */
type Row = Record<string, unknown>;

function fakeSupabase(tables: Record<string, Row[]>) {
  let nextId = 1;

  function builder(table: string) {
    const store = tables[table] ?? (tables[table] = []);
    const filters: Array<(row: Row) => boolean> = [];
    let orderBy: { col: string; ascending: boolean } | null = null;

    const api = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return api;
      },
      is: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((row) => vals.includes(row[col]));
        return api;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderBy = { col, ascending: opts?.ascending ?? true };
        return api;
      },
      single: async () => {
        const [match] = store.filter((row) => filters.every((f) => f(row)));
        return match ? { data: match, error: null } : { data: null, error: { message: "no encontrado" } };
      },
      insert: (payload: Row | Row[]) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        const withIds = rows.map((r) => ({ id: `nueva-${nextId++}`, ...r }));
        store.push(...withIds);
        return {
          select: () => ({
            single: async () => ({ data: { id: withIds[0].id }, error: null }),
          }),
          then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
        };
      },
      then: (resolve: (v: { data: Row[]; error: null }) => void) => {
        let rows = store.filter((row) => filters.every((f) => f(row)));
        if (orderBy) {
          const { col, ascending } = orderBy;
          rows = [...rows].sort((a, b) => (ascending ? 1 : -1) * (Number(a[col]) - Number(b[col])));
        }
        resolve({ data: rows, error: null });
      },
    };
    return api;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (table: string) => builder(table) } as any;
}

/**
 * Un proyecto "Original" (anidado bajo "padre", favorito y archivado) con:
 * dos secciones, un subproyecto propio (no debe copiarse — D-C), dos
 * tareas raíz pendientes (una con dos subtareas, una de ellas completada) y
 * una tarea raíz completada (no debe copiarse — D-B). Etiquetas en la
 * pendiente y en la subtarea completada; recordatorio y comentario en la
 * pendiente.
 */
function buildTables(): Record<string, Row[]> {
  return {
    projects: [
      { id: "padre", user_id: "u1", parent_id: null, name: "Padre", color: "celeste", icon: null, description: null, preferred_view: "list", is_favorite: false, is_archived: false, is_inbox: false, is_example: false, position: 500 },
      {
        id: "p1",
        user_id: "u1",
        parent_id: "padre",
        name: "Original",
        color: "violeta",
        icon: "🚀",
        description: "Descripción del original",
        preferred_view: "board",
        is_favorite: true,
        is_archived: true,
        is_inbox: false,
        is_example: false,
        position: 1000,
      },
      { id: "hermano", user_id: "u1", parent_id: "padre", name: "Hermano", color: "celeste", icon: null, description: null, preferred_view: "list", is_favorite: false, is_archived: false, is_inbox: false, is_example: false, position: 2000 },
      { id: "sub1", user_id: "u1", parent_id: "p1", name: "Subproyecto de Original", color: "celeste", icon: null, description: null, preferred_view: "list", is_favorite: false, is_archived: false, is_inbox: false, is_example: false, position: 1000 },
    ],
    sections: [
      { id: "secA", user_id: "u1", project_id: "p1", name: "Por hacer", description: "sección A", position: 1000, is_collapsed: false },
      { id: "secB", user_id: "u1", project_id: "p1", name: "Hecho", description: null, position: 2000, is_collapsed: false },
    ],
    tasks: [
      {
        id: "rp1",
        user_id: "u1",
        project_id: "p1",
        section_id: "secA",
        parent_id: null,
        title: "Pendiente con subtareas",
        description: null,
        priority: 1,
        due_date: "2026-08-01",
        due_at: null,
        duration_minutes: null,
        deadline: null,
        recurrence_rule: null,
        recurrence_ends_at: null,
        recurrence_count: null,
        recurrence_anchor: null,
        completed_at: null,
        position: 1000,
      },
      {
        id: "rp1-sub-pend",
        user_id: "u1",
        project_id: "p1",
        section_id: "secA",
        parent_id: "rp1",
        title: "Subtarea pendiente",
        description: null,
        priority: 4,
        due_date: null,
        due_at: null,
        duration_minutes: null,
        deadline: null,
        recurrence_rule: null,
        recurrence_ends_at: null,
        recurrence_count: null,
        recurrence_anchor: null,
        completed_at: null,
        position: 1000,
      },
      {
        id: "rp1-sub-comp",
        user_id: "u1",
        project_id: "p1",
        section_id: "secA",
        parent_id: "rp1",
        title: "Subtarea completada",
        description: null,
        priority: 4,
        due_date: null,
        due_at: null,
        duration_minutes: null,
        deadline: null,
        recurrence_rule: null,
        recurrence_ends_at: null,
        recurrence_count: null,
        recurrence_anchor: null,
        completed_at: "2026-08-01T00:00:00Z",
        position: 2000,
      },
      {
        id: "rp2",
        user_id: "u1",
        project_id: "p1",
        section_id: "secB",
        parent_id: null,
        title: "Otra pendiente sin subtareas",
        description: null,
        priority: 4,
        due_date: null,
        due_at: null,
        duration_minutes: null,
        deadline: null,
        recurrence_rule: null,
        recurrence_ends_at: null,
        recurrence_count: null,
        recurrence_anchor: null,
        completed_at: null,
        position: 2000,
      },
      {
        id: "rc1",
        user_id: "u1",
        project_id: "p1",
        section_id: null,
        parent_id: null,
        title: "Tarea completada",
        description: null,
        priority: 4,
        due_date: null,
        due_at: null,
        duration_minutes: null,
        deadline: null,
        recurrence_rule: null,
        recurrence_ends_at: null,
        recurrence_count: null,
        recurrence_anchor: null,
        completed_at: "2026-08-01T00:00:00Z",
        position: 3000,
      },
    ],
    task_labels: [
      { task_id: "rp1", label_id: "lblA", user_id: "u1" },
      { task_id: "rp1-sub-comp", label_id: "lblB", user_id: "u1" },
      { task_id: "rc1", label_id: "lblC", user_id: "u1" },
    ],
    reminders: [{ id: "rem1", user_id: "u1", task_id: "rp1", remind_at: "2026-08-01T09:00:00Z", offset_minutes: null, delivered_at: null }],
    comments: [{ id: "com1", user_id: "u1", task_id: "rp1", content: "hola", created_at: "a", updated_at: "a" }],
  };
}

describe("duplicateProject (duplicar-un-proyecto)", () => {
  it("copia el proyecto junto al original, sus secciones, sus tareas pendientes con subtareas y etiquetas, y nada más", async () => {
    const tables = buildTables();
    const supabase = fakeSupabase(tables);

    const newProjectId = await duplicateProject(supabase, "u1", "p1", 1500);

    // El proyecto: nombre con sufijo, mismos color/ícono/descripción/vista,
    // mismo padre que el original (D-C: "junto al original en el árbol").
    const newProject = tables.projects.find((p) => p.id === newProjectId)!;
    expect(newProject.name).toBe("Original (copia)");
    expect(newProject.color).toBe("violeta");
    expect(newProject.icon).toBe("🚀");
    expect(newProject.description).toBe("Descripción del original");
    expect(newProject.preferred_view).toBe("board");
    expect(newProject.parent_id).toBe("padre");
    expect(newProject.position).toBe(1500);
    // Favorito y archivado no viajan: el insert nunca los toca.
    expect("is_favorite" in newProject).toBe(false);
    expect("is_archived" in newProject).toBe(false);

    // Los subproyectos del original no se arrastran (D-C): ningún proyecto
    // nuevo, aparte de la copia misma, tiene padre relacionado con p1/copia.
    const newProjects = tables.projects.filter((p) => !["padre", "p1", "hermano", "sub1"].includes(p.id as string));
    expect(newProjects).toHaveLength(1);
    expect(newProjects[0].id).toBe(newProjectId);

    // Secciones: las dos, con su descripción y posición, en el proyecto nuevo.
    const newSections = tables.sections.filter((s) => s.project_id === newProjectId);
    expect(newSections).toHaveLength(2);
    const byName = new Map(newSections.map((s) => [s.name, s]));
    expect(byName.get("Por hacer")?.description).toBe("sección A");
    expect(byName.get("Hecho")?.description).toBeNull();

    // Tareas raíz: rp1 y rp2 se copiaron; rc1 (completada) no.
    const newRootTasks = tables.tasks.filter((t) => t.project_id === newProjectId && t.parent_id === null);
    expect(newRootTasks.map((t) => t.title).sort()).toEqual(["Otra pendiente sin subtareas", "Pendiente con subtareas"]);
    expect(tables.tasks.filter((t) => t.title === "Tarea completada" && t.project_id === newProjectId)).toHaveLength(0);

    const newRp1 = newRootTasks.find((t) => t.title === "Pendiente con subtareas")!;
    const newRp2 = newRootTasks.find((t) => t.title === "Otra pendiente sin subtareas")!;
    // Las fechas se copian tal cual (D-A).
    expect(newRp1.due_date).toBe("2026-08-01");
    // Cada raíz cae en la sección que le corresponde, mapeada a la nueva.
    expect(newRp1.section_id).toBe(byName.get("Por hacer")!.id);
    expect(newRp2.section_id).toBe(byName.get("Hecho")!.id);

    // Las dos subtareas de rp1 viajan, la completada incluida (duplicar un
    // proyecto no le inventa a duplicateTaskTree una regla de poda que no
    // tiene para una sola tarea): nacen pendientes y sin sección propia.
    const newSubtasks = tables.tasks.filter((t) => t.parent_id === newRp1.id);
    expect(newSubtasks.map((t) => t.title).sort()).toEqual(["Subtarea completada", "Subtarea pendiente"]);
    for (const sub of newSubtasks) {
      // `completed_at` no está entre las columnas que copia `duplicateTaskTree`
      // (F2 del design de `tareas`): la fila nueva nace sin esa columna, no
      // con un valor explícito, así que "no completada" es "no truthy".
      expect(sub.completed_at).toBeFalsy();
      expect(sub.section_id).toBeNull();
    }

    // Etiquetas: viajan las de rp1 y las de la subtarea reencarnada pendiente.
    const newSubComp = newSubtasks.find((t) => t.title === "Subtarea completada")!;
    const newLabelLinks = tables.task_labels.filter((l) => l.user_id === "u1" && [newRp1.id, newSubComp.id].includes(l.task_id));
    expect(newLabelLinks.map((l) => l.label_id).sort()).toEqual(["lblA", "lblB"]);
    // La tarea completada (rc1) nunca se copió, así que su etiqueta tampoco viaja.
    expect(tables.task_labels.some((l) => l.label_id === "lblC" && l.task_id !== "rc1")).toBe(false);

    // Recordatorios y comentarios: ninguna fila nueva — el daño real que
    // señala design.md (dos avisos para el mismo momento).
    expect(tables.reminders).toHaveLength(1);
    expect(tables.comments).toHaveLength(1);
  });

  it("un proyecto sin tareas ni secciones se duplica igual, sin insertar filas de más", async () => {
    const tables: Record<string, Row[]> = {
      projects: [
        { id: "p1", user_id: "u1", parent_id: null, name: "Vacío", color: "celeste", icon: null, description: null, preferred_view: "list", is_favorite: false, is_archived: false, is_inbox: false, is_example: false, position: 1000 },
      ],
      sections: [],
      tasks: [],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables);

    const newProjectId = await duplicateProject(supabase, "u1", "p1", 1500);

    expect(tables.projects).toHaveLength(2);
    expect(tables.sections).toHaveLength(0);
    expect(tables.tasks.filter((t) => t.project_id === newProjectId)).toHaveLength(0);
    expect(tables.task_labels).toHaveLength(0);
  });
});
