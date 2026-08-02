/**
 * Tests del disparador de recálculo de recordatorios relativos
 * (`recordatorios-con-hora-de-referencia`, decisión D-D, tarea 2.6): el
 * punto de mayor riesgo de esta propuesta. Antes, sacarle la hora a una
 * tarea BORRABA sus relativos pendientes. Ahora, si la tarea conserva su
 * día, el disparador tiene que recalcularlos contra la hora de referencia
 * en vez de borrarlos — solo quedarse sin ninguna fecha borra.
 *
 * Corren contra el Supabase local real (Docker), no un mock: la conversión
 * fecha + hora de referencia + zona horaria a instante pasa por SQL
 * (`at time zone`), y es exactamente el tipo de cálculo que un test que
 * corre en la misma zona que la preferencia no detecta si está mal. Por
 * eso el último caso usa una zona bien distinta de la del entorno
 * (Asia/Tokyo) en vez de la zona por defecto de la app
 * (America/Argentina/Buenos_Aires).
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

async function createTestUser(): Promise<TestUser> {
  const email = `reminders-recalc-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  }

  const client = createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión: ${signInError.message}`);
  }

  return { id: data.user.id, client };
}

let user: TestUser;
let projectId: string;

beforeAll(async () => {
  user = await createTestUser();
  const { data: projectData, error: projectError } = await user.client
    .from("projects")
    .insert({ user_id: user.id, name: "Proyecto de prueba (recálculo)", color: "celeste", position: 1000 })
    .select("id")
    .single();
  projectId = unwrap(projectData, projectError, "Proyecto de prueba").id;
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

afterEach(async () => {
  // Cada test deja timezone/reference_time como las encontró, mismo patrón
  // de limpieza que buscar-tareas.test.ts/habit-streak.test.ts.
  assertOk(
    (
      await user.client
        .from("user_preferences")
        .update({ timezone: "America/Argentina/Buenos_Aires", reference_time: "09:00:00" })
        .eq("user_id", user.id)
    ).error,
    "Restaurar preferencias",
  );
});

async function createTask(fields: { due_date?: string | null; due_at?: string | null }): Promise<string> {
  const { data, error } = await user.client
    .from("tasks")
    .insert({ user_id: user.id, project_id: projectId, title: "Tarea de prueba", position: 1000, ...fields })
    .select("id")
    .single();
  return unwrap(data, error, "Tarea de prueba").id;
}

async function addReminder(taskId: string, remindAt: string, offsetMinutes: number | null): Promise<string> {
  const { data, error } = await user.client
    .from("reminders")
    .insert({ user_id: user.id, task_id: taskId, remind_at: remindAt, offset_minutes: offsetMinutes })
    .select("id")
    .single();
  return unwrap(data, error, "Recordatorio").id;
}

async function getReminder(id: string): Promise<{ remind_at: string; delivered_at: string | null } | null> {
  const { data } = await user.client.from("reminders").select("remind_at, delivered_at").eq("id", id).maybeSingle();
  return data;
}

function isoOf(remindAt: string | undefined | null): string {
  return new Date(remindAt ?? "").toISOString();
}

describe("recalculate_relative_reminders: recálculo ante cambios de fecha u hora (D-D)", () => {
  it("mover la hora de una tarea con hora mueve su recordatorio relativo", async () => {
    const taskId = await createTask({ due_at: "2026-08-05T10:00:00Z" });
    const reminderId = await addReminder(taskId, "2026-08-05T09:00:00Z", -60);

    assertOk(
      (await user.client.from("tasks").update({ due_at: "2026-08-05T12:00:00Z" }).eq("id", taskId)).error,
      "Mover hora",
    );

    const reminder = await getReminder(reminderId);
    expect(isoOf(reminder?.remind_at)).toBe("2026-08-05T11:00:00.000Z");
  });

  it("mover el día de una tarea sin hora mueve su recordatorio relativo, contra la hora de referencia", async () => {
    const taskId = await createTask({ due_date: "2026-08-05" });
    const reminderId = await addReminder(taskId, "2026-08-04T12:00:00Z", -1440);

    assertOk((await user.client.from("tasks").update({ due_date: "2026-08-10" }).eq("id", taskId)).error, "Mover día");

    const reminder = await getReminder(reminderId);
    // 09:00 ART (hora de referencia) del 9 de agosto, un día antes del 10 = 12:00 UTC.
    expect(isoOf(reminder?.remind_at)).toBe("2026-08-09T12:00:00.000Z");
  });

  it("quitarle la hora a una tarea que conserva su día NO borra el recordatorio: lo recalcula (riesgo D-D)", async () => {
    const taskId = await createTask({ due_at: "2026-08-05T10:00:00Z" });
    const reminderId = await addReminder(taskId, "2026-08-05T09:00:00Z", -60);

    assertOk(
      (await user.client.from("tasks").update({ due_at: null, due_date: "2026-08-05" }).eq("id", taskId)).error,
      "Quitar hora, conservar día",
    );

    const reminder = await getReminder(reminderId);
    expect(reminder).not.toBeNull();
    // 09:00 ART del 5 de agosto - 60min = 08:00 ART = 11:00 UTC.
    expect(isoOf(reminder?.remind_at)).toBe("2026-08-05T11:00:00.000Z");
  });

  it("quedarse sin ninguna fecha SÍ borra el recordatorio relativo pendiente", async () => {
    const taskId = await createTask({ due_date: "2026-08-05" });
    const reminderId = await addReminder(taskId, "2026-08-04T12:00:00Z", -1440);

    assertOk((await user.client.from("tasks").update({ due_date: null }).eq("id", taskId)).error, "Quitar toda la fecha");

    const reminder = await getReminder(reminderId);
    expect(reminder).toBeNull();
  });

  it("un recordatorio ya entregado y uno puntual no se tocan cuando la tarea cambia de hora", async () => {
    const taskId = await createTask({ due_at: "2026-08-05T10:00:00Z" });
    const deliveredId = await addReminder(taskId, "2026-08-05T09:00:00Z", -60);
    assertOk(
      (await admin.from("reminders").update({ delivered_at: new Date().toISOString() }).eq("id", deliveredId)).error,
      "Marcar entregado",
    );
    const puntualId = await addReminder(taskId, "2026-08-05T08:00:00Z", null);

    assertOk(
      (await user.client.from("tasks").update({ due_at: "2026-08-05T18:00:00Z" }).eq("id", taskId)).error,
      "Mover hora",
    );

    const deliveredAfter = await getReminder(deliveredId);
    const puntualAfter = await getReminder(puntualId);
    expect(isoOf(deliveredAfter?.remind_at)).toBe("2026-08-05T09:00:00.000Z");
    expect(isoOf(puntualAfter?.remind_at)).toBe("2026-08-05T08:00:00.000Z");
  });

  it("una zona horaria bien distinta de la del entorno resuelve el instante correctamente (Asia/Tokyo)", async () => {
    assertOk(
      (
        await user.client
          .from("user_preferences")
          .update({ timezone: "Asia/Tokyo", reference_time: "09:00:00" })
          .eq("user_id", user.id)
      ).error,
      "Cambiar a Asia/Tokyo",
    );

    const taskId = await createTask({ due_date: "2026-08-05" });
    const reminderId = await addReminder(taskId, "2026-08-03T00:00:00Z", -1440);

    assertOk((await user.client.from("tasks").update({ due_date: "2026-08-11" }).eq("id", taskId)).error, "Mover día");

    const reminder = await getReminder(reminderId);
    // 09:00 JST del 10 de agosto (un día antes del 11) = 00:00 UTC del 10 (JST = UTC+9).
    expect(isoOf(reminder?.remind_at)).toBe("2026-08-10T00:00:00.000Z");
  });
});
