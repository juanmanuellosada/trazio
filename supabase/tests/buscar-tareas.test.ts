/**
 * Tests de `buscar_tareas` (tarea 2.9 de
 * openspec/changes/fase-2-potencia/tasks.md): la función que evalúa el AST
 * del lenguaje de consulta en Postgres (D-A de design.md). Cubre lo que más
 * importa que salga bien: un AST hostil (campos inexistentes, tipos
 * equivocados, AST vacío) devuelve error y nunca filas de otro usuario, y el
 * caso de referencia del roadmap `(priority:1,2 & due:next7days) &
 * !label:espera` funciona de punta a punta contra datos reales.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y el stack local ya
 * levantado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";
import { assertOk, unwrap } from "./helpers";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  id: string;
  client: SupabaseClient;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `buscar-tareas-${label}-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba "${label}": ${error?.message}`);
  }

  const client = createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión con "${label}": ${signInError.message}`);
  }

  return { id: data.user.id, client };
}

let userA: TestUser;
let userB: TestUser;

// Fixtures de A: tres tareas que separan los tres criterios del caso de
// referencia (prioridad, ventana de vencimiento, ausencia de etiqueta).
let taskMatchId: string; // prioridad 1, vence en 3 días, sin la etiqueta "espera"
let taskWithLabelId: string; // prioridad 2, vence en 3 días, CON la etiqueta "espera"
let taskWrongPriorityId: string; // prioridad 3: no matchea por prioridad
let taskBId: string; // tarea de B, para probar aislamiento

beforeAll(async () => {
  userA = await createTestUser("a");
  userB = await createTestUser("b");

  const { data: projectA, error: projectAError } = await userA.client
    .from("projects")
    .insert({ user_id: userA.id, name: "Proyecto de A", color: "celeste", position: 1000 })
    .select("id")
    .single();
  const projA = unwrap(projectA, projectAError, "Proyecto de A");

  const { data: labelData, error: labelError } = await userA.client
    .from("labels")
    .insert({ user_id: userA.id, name: "Espera", color: "amarillo" })
    .select("id")
    .single();
  const label = unwrap(labelData, labelError, "Etiqueta Espera");

  const { data: matchData, error: matchError } = await userA.client
    .from("tasks")
    .insert({
      user_id: userA.id,
      project_id: projA.id,
      title: "Tarea que matchea el caso de referencia",
      priority: 1,
      due_date: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      position: 1000,
    })
    .select("id")
    .single();
  taskMatchId = unwrap(matchData, matchError, "Tarea que matchea").id;

  const { data: labeledData, error: labeledError } = await userA.client
    .from("tasks")
    .insert({
      user_id: userA.id,
      project_id: projA.id,
      title: "Tarea con la etiqueta espera",
      priority: 2,
      due_date: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      position: 1001,
    })
    .select("id")
    .single();
  taskWithLabelId = unwrap(labeledData, labeledError, "Tarea con etiqueta").id;
  assertOk(
    (await userA.client.from("task_labels").insert({ task_id: taskWithLabelId, label_id: label.id, user_id: userA.id }))
      .error,
    "Asignar etiqueta espera",
  );

  const { data: wrongPriorityData, error: wrongPriorityError } = await userA.client
    .from("tasks")
    .insert({
      user_id: userA.id,
      project_id: projA.id,
      title: "Tarea de prioridad equivocada",
      priority: 3,
      due_date: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      position: 1002,
    })
    .select("id")
    .single();
  taskWrongPriorityId = unwrap(wrongPriorityData, wrongPriorityError, "Tarea de prioridad equivocada").id;

  const { data: projectB, error: projectBError } = await userB.client
    .from("projects")
    .insert({ user_id: userB.id, name: "Proyecto de B", color: "verde", position: 1000 })
    .select("id")
    .single();
  const projB = unwrap(projectB, projectBError, "Proyecto de B");

  const { data: taskB, error: taskBError } = await userB.client
    .from("tasks")
    .insert({
      user_id: userB.id,
      project_id: projB.id,
      title: "Tarea de B, prioridad 1",
      priority: 1,
      due_date: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      position: 1000,
    })
    .select("id")
    .single();
  taskBId = unwrap(taskB, taskBError, "Tarea de B").id;
}, 30_000);

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

const ROADMAP_AST = {
  type: "and",
  left: {
    type: "and",
    left: { type: "field", field: "priority", values: [1, 2] },
    right: { type: "field", field: "due", condition: { kind: "next7days" } },
  },
  right: { type: "not", expr: { type: "field", field: "label", values: ["espera"] } },
};

describe("buscar_tareas: el caso de referencia del roadmap", () => {
  it("(priority:1,2 & due:next7days) & !label:espera devuelve exactamente lo esperado", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", { ast: ROADMAP_AST });
    expect(error).toBeNull();
    const ids = (data ?? []).map((t: { id: string }) => t.id);
    expect(ids).toEqual([taskMatchId]);
    expect(ids).not.toContain(taskWithLabelId);
    expect(ids).not.toContain(taskWrongPriorityId);
  });

  it('!label:espera es no-existencia: una tarea sin ninguna etiqueta también matchea', async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", {
      ast: { type: "not", expr: { type: "field", field: "label", values: ["espera"] } },
    });
    expect(error).toBeNull();
    const ids = (data ?? []).map((t: { id: string }) => t.id);
    // taskWrongPriorityId no tiene ninguna etiqueta asignada: la ausencia
    // total de etiquetas también es "no tiene la etiqueta espera".
    expect(ids).toContain(taskWrongPriorityId);
    expect(ids).toContain(taskMatchId);
    expect(ids).not.toContain(taskWithLabelId);
  });
});

describe("buscar_tareas: la RLS sigue aislando por usuario", () => {
  it("una consulta válida de A nunca devuelve tareas de B", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", {
      ast: { type: "field", field: "priority", values: [1] },
    });
    expect(error).toBeNull();
    const ids = (data ?? []).map((t: { id: string }) => t.id);
    expect(ids).not.toContain(taskBId);
  });

  it("una consulta de B con la misma condición que matchea a A solo devuelve las tareas de B", async () => {
    const { data, error } = await userB.client.rpc("buscar_tareas", {
      ast: { type: "field", field: "priority", values: [1] },
    });
    expect(error).toBeNull();
    const ids = (data ?? []).map((t: { id: string }) => t.id);
    expect(ids).toEqual([taskBId]);
  });
});

describe("buscar_tareas: un AST hostil devuelve error, nunca un resultado vacío silencioso", () => {
  it("un campo fuera de la lista blanca es un error", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", {
      ast: { type: "field", field: "user_id", values: ["cualquier-cosa"] },
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("un tipo de nodo desconocido es un error", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", {
      ast: { type: "xor", left: { type: "field", field: "priority", values: [1] } },
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("un AST vacío es un error, incluso si el usuario no tiene tareas que evaluar", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", { ast: {} });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("un valor de tipo equivocado (texto donde se espera número) es un error", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", {
      ast: { type: "field", field: "priority", values: ["no-es-un-numero"] },
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("una condición de due desconocida es un error", async () => {
    const { data, error } = await userA.client.rpc("buscar_tareas", {
      ast: { type: "field", field: "due", condition: { kind: "algun-dia" } },
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

describe("buscar_tareas: completed queda afuera por defecto", () => {
  it("una consulta que no menciona completed excluye lo completado", async () => {
    const { data: completedTask, error: completeError } = await userA.client
      .from("tasks")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", taskMatchId)
      .select("id")
      .single();
    expect(completeError).toBeNull();
    expect(completedTask?.id).toBe(taskMatchId);

    try {
      const { data, error } = await userA.client.rpc("buscar_tareas", {
        ast: { type: "field", field: "priority", values: [1] },
      });
      expect(error).toBeNull();
      expect((data ?? []).map((t: { id: string }) => t.id)).not.toContain(taskMatchId);

      const { data: withCompleted, error: withCompletedError } = await userA.client.rpc("buscar_tareas", {
        ast: {
          type: "and",
          left: { type: "field", field: "priority", values: [1] },
          right: { type: "field", field: "completed", value: true },
        },
      });
      expect(withCompletedError).toBeNull();
      expect((withCompleted ?? []).map((t: { id: string }) => t.id)).toContain(taskMatchId);
    } finally {
      await userA.client.from("tasks").update({ completed_at: null }).eq("id", taskMatchId);
    }
  });
});

describe("buscar_tareas: el campo search usa el mismo search_vector que el buscador", () => {
  it('"reunion" (sin tilde) encuentra una tarea titulada "Reunión"', async () => {
    const { data: taskData, error: taskError } = await userA.client
      .from("tasks")
      .insert({
        user_id: userA.id,
        project_id: (await userA.client.from("projects").select("id").eq("user_id", userA.id).limit(1).single())
          .data!.id,
        title: "Reunión de equipo",
        position: 2000,
      })
      .select("id")
      .single();
    const task = unwrap(taskData, taskError, "Reunión de equipo");

    try {
      const { data, error } = await userA.client.rpc("buscar_tareas", {
        ast: { type: "field", field: "search", value: "reunion" },
      });
      expect(error).toBeNull();
      expect((data ?? []).map((t: { id: string }) => t.id)).toContain(task.id);
    } finally {
      await userA.client.from("tasks").delete().eq("id", task.id);
    }
  });
});

describe("buscar_tareas: search: evalúa contra el índice, no fila por fila", () => {
  it(
    "un usuario con decenas de miles de tareas propias responde en un tiempo acotado",
    async () => {
      const user = await createTestUser("perf");
      try {
        const { data: project, error: projectError } = await user.client
          .from("projects")
          .insert({ user_id: user.id, name: "Proyecto de rendimiento", color: "celeste", position: 1000 })
          .select("id")
          .single();
        const proj = unwrap(project, projectError, "Proyecto de rendimiento");

        // 80.000 tareas propias, 160 con la palabra rara "extraordinaria".
        // La implementación fila por fila (PL/pgSQL recursivo re-parseando
        // el jsonb en cada fila candidata) tardaba ~300ms en este mismo
        // stack local para este volumen; la que compila el AST a un
        // predicado SQL nativo tarda ~50ms. 150ms deja margen amplio de
        // los dos lados: si alguien vuelve a evaluar el AST fila por fila,
        // este test se cae.
        const TOTAL = 80_000;
        const CHUNK = 2_000;
        for (let start = 0; start < TOTAL; start += CHUNK) {
          const rows = [];
          for (let i = start; i < Math.min(start + CHUNK, TOTAL); i++) {
            rows.push({
              user_id: user.id,
              project_id: proj.id,
              title: i % 500 === 0 ? `Palabra extraordinaria número ${i}` : `Tarea genérica número ${i}`,
              position: i,
            });
          }
          const { error } = await admin.from("tasks").insert(rows);
          assertOk(error, "Semilla de tareas de rendimiento");
        }

        const start = Date.now();
        const { data, error } = await user.client.rpc("buscar_tareas", {
          ast: { type: "field", field: "search", value: "extraordinaria" },
        });
        const elapsed = Date.now() - start;

        expect(error).toBeNull();
        expect((data ?? []).length).toBe(160);
        expect(elapsed).toBeLessThan(150);
      } finally {
        await admin.auth.admin.deleteUser(user.id);
      }
    },
    60_000,
  );
});

describe("buscar_tareas: due:today usa la zona horaria del usuario, no la del servidor", () => {
  // A las 22:00 del 29/07 en Buenos Aires (UTC-3) ya son las 01:00 del
  // 30/07 en UTC: current_date del servidor (D8 rota, bug reportado)
  // devolvería el 30, un día adelantado respecto del día del usuario. `at`
  // fija ese instante exacto para el test, sin depender de la hora real a
  // la que corra la suite (Postgres no tiene forma de "congelar" `now()`).
  const AT_22_BA = "2026-07-29T22:00:00-03:00";

  it("a esa hora, due:today devuelve las tareas de hoy local, no las de mañana en UTC", async () => {
    const { data: project, error: projectError } = await userA.client
      .from("projects")
      .select("id")
      .eq("user_id", userA.id)
      .limit(1)
      .single();
    const projA = unwrap(project, projectError, "Proyecto de A (reutilizado)");

    const { data: todayTask, error: todayError } = await userA.client
      .from("tasks")
      .insert({
        user_id: userA.id,
        project_id: projA.id,
        title: "Vence hoy en Buenos Aires",
        due_date: "2026-07-29",
        position: 3000,
      })
      .select("id")
      .single();
    const taskToday = unwrap(todayTask, todayError, "Vence hoy en Buenos Aires");

    const { data: tomorrowTask, error: tomorrowError } = await userA.client
      .from("tasks")
      .insert({
        user_id: userA.id,
        project_id: projA.id,
        title: "Vence mañana en Buenos Aires (hoy en UTC)",
        due_date: "2026-07-30",
        position: 3001,
      })
      .select("id")
      .single();
    const taskTomorrow = unwrap(tomorrowTask, tomorrowError, "Vence mañana en Buenos Aires");

    try {
      const { data, error } = await userA.client.rpc("buscar_tareas", {
        ast: { type: "field", field: "due", condition: { kind: "today" } },
        at: AT_22_BA,
      });
      expect(error).toBeNull();
      const ids = (data ?? []).map((t: { id: string }) => t.id);
      expect(ids).toContain(taskToday.id);
      expect(ids).not.toContain(taskTomorrow.id);
    } finally {
      await userA.client.from("tasks").delete().in("id", [taskToday.id, taskTomorrow.id]);
    }
  });

  it("el mismo instante con timezone UTC en las preferencias resuelve el otro día (confirma que lee user_preferences.timezone)", async () => {
    assertOk(
      (await userB.client.from("user_preferences").update({ timezone: "UTC" }).eq("user_id", userB.id)).error,
      "Cambiar timezone de B a UTC",
    );

    const { data: project, error: projectError } = await userB.client
      .from("projects")
      .select("id")
      .eq("user_id", userB.id)
      .limit(1)
      .single();
    const projB = unwrap(project, projectError, "Proyecto de B (reutilizado)");

    const { data: utcTodayTask, error: utcTodayError } = await userB.client
      .from("tasks")
      .insert({
        user_id: userB.id,
        project_id: projB.id,
        title: "Vence hoy en UTC",
        due_date: "2026-07-30",
        position: 3000,
      })
      .select("id")
      .single();
    const taskUtcToday = unwrap(utcTodayTask, utcTodayError, "Vence hoy en UTC");

    try {
      const { data, error } = await userB.client.rpc("buscar_tareas", {
        ast: { type: "field", field: "due", condition: { kind: "today" } },
        at: AT_22_BA,
      });
      expect(error).toBeNull();
      expect((data ?? []).map((t: { id: string }) => t.id)).toContain(taskUtcToday.id);
    } finally {
      await userB.client.from("tasks").delete().eq("id", taskUtcToday.id);
      await userB.client.from("user_preferences").update({ timezone: "America/Argentina/Buenos_Aires" }).eq("user_id", userB.id);
    }
  });
});
