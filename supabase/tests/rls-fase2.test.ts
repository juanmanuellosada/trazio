/**
 * Tests de RLS para las cinco tablas nuevas de fase 2 (tarea 1.12 de
 * openspec/changes/fase-2-potencia/tasks.md): comments, reminders,
 * push_subscriptions, filters y view_preferences. Mismo patrón que
 * supabase/tests/rls.test.ts: dos usuarios reales contra el Supabase local
 * (Docker), verificando que uno no pueda leer, insertar en nombre del otro,
 * actualizar ni borrar sus filas.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";
import { unwrap } from "./helpers";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  id: string;
  client: SupabaseClient;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `rls-fase2-${label}-${randomUUID()}@example.com`;
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

interface Fixtures {
  taskId: string;
}

/** Crea, con el propio cliente autenticado del usuario, un proyecto y una
 * tarea, base para colgar comentarios y recordatorios. */
async function createFixtures(user: TestUser): Promise<Fixtures> {
  const { data: projectData, error: projectError } = await user.client
    .from("projects")
    .insert({ user_id: user.id, name: "Proyecto de prueba", color: "celeste", position: 1000 })
    .select("id")
    .single();
  const project = unwrap(projectData, projectError, "Proyecto de prueba");

  const { data: taskData, error: taskError } = await user.client
    .from("tasks")
    .insert({ user_id: user.id, project_id: project.id, title: "Tarea de prueba", position: 1000 })
    .select("id")
    .single();
  const task = unwrap(taskData, taskError, "Tarea de prueba");

  return { taskId: task.id };
}

let userA: TestUser;
let userB: TestUser;
let fixturesA: Fixtures;

beforeAll(async () => {
  userA = await createTestUser("a");
  userB = await createTestUser("b");
  fixturesA = await createFixtures(userA);
  // B necesita su propio proyecto y tarea para que las políticas de RLS
  // tengan algo real que aislar; ningún test referencia sus ids directamente.
  await createFixtures(userB);
}, 30_000);

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

describe("RLS: aislamiento entre usuarios (tablas de fase 2)", () => {
  it("comments: B no puede leer, insertar en nombre de A, actualizar ni borrar el comentario de A", async () => {
    const { data: commentData, error: commentError } = await userA.client
      .from("comments")
      .insert({ user_id: userA.id, task_id: fixturesA.taskId, content: { type: "doc", content: [] } })
      .select("id")
      .single();
    const comment = unwrap(commentData, commentError, "Comentario de A");

    const { data: readAsB } = await userB.client.from("comments").select("id").eq("id", comment.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("comments")
      .insert({ user_id: userA.id, task_id: fixturesA.taskId, content: { type: "doc", content: [] } });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("comments")
      .update({ content: { type: "doc", content: [{ type: "text", text: "hackeado" }] } })
      .eq("id", comment.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client.from("comments").delete().eq("id", comment.id).select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin.from("comments").select("id").eq("id", comment.id).maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("reminders: B no puede leer, insertar en nombre de A, actualizar ni borrar el recordatorio de A", async () => {
    const { data: reminderData, error: reminderError } = await userA.client
      .from("reminders")
      .insert({ user_id: userA.id, task_id: fixturesA.taskId, remind_at: "2026-08-01T10:00:00Z" })
      .select("id")
      .single();
    const reminder = unwrap(reminderData, reminderError, "Recordatorio de A");

    const { data: readAsB } = await userB.client.from("reminders").select("id").eq("id", reminder.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("reminders")
      .insert({ user_id: userA.id, task_id: fixturesA.taskId, remind_at: "2026-08-02T10:00:00Z" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("reminders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", reminder.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client.from("reminders").delete().eq("id", reminder.id).select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin.from("reminders").select("id").eq("id", reminder.id).maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("push_subscriptions: B no puede leer, insertar en nombre de A, actualizar ni borrar la suscripción de A", async () => {
    const { data: subData, error: subError } = await userA.client
      .from("push_subscriptions")
      .insert({
        user_id: userA.id,
        endpoint: `https://push.example.com/${randomUUID()}`,
        p256dh: "clave-p256dh",
        auth: "clave-auth",
      })
      .select("id")
      .single();
    const subscription = unwrap(subData, subError, "Suscripción de A");

    const { data: readAsB } = await userB.client.from("push_subscriptions").select("id").eq("id", subscription.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("push_subscriptions").insert({
      user_id: userA.id,
      endpoint: `https://push.example.com/${randomUUID()}`,
      p256dh: "otra-clave",
      auth: "otra-clave",
    });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("push_subscriptions")
      .update({ p256dh: "hackeado" })
      .eq("id", subscription.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client
      .from("push_subscriptions")
      .delete()
      .eq("id", subscription.id)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("push_subscriptions")
      .select("id")
      .eq("id", subscription.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("filters: B no puede leer, insertar en nombre de A, actualizar ni borrar el filtro de A", async () => {
    const { data: filterData, error: filterError } = await userA.client
      .from("filters")
      .insert({ user_id: userA.id, name: "Filtro de prueba", query: "priority:1", color: "celeste" })
      .select("id")
      .single();
    const filter = unwrap(filterData, filterError, "Filtro de A");

    const { data: readAsB } = await userB.client.from("filters").select("id").eq("id", filter.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("filters")
      .insert({ user_id: userA.id, name: "Filtro suplantado", query: "priority:1", color: "celeste" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("filters")
      .update({ name: "Hackeado" })
      .eq("id", filter.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client.from("filters").delete().eq("id", filter.id).select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin.from("filters").select("id").eq("id", filter.id).maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("view_preferences: B no puede leer, insertar en nombre de A, actualizar ni borrar las opciones de A", async () => {
    const viewKey = `proyecto:${randomUUID()}`;
    const { error: insertOwnError } = await userA.client
      .from("view_preferences")
      .insert({ user_id: userA.id, view_key: viewKey, options: { sort: "manual" } });
    expect(insertOwnError).toBeNull();

    const { data: readAsB } = await userB.client
      .from("view_preferences")
      .select("view_key")
      .eq("user_id", userA.id)
      .eq("view_key", viewKey);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("view_preferences")
      .insert({ user_id: userA.id, view_key: viewKey, options: { sort: "hackeado" } });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("view_preferences")
      .update({ options: { sort: "hackeado" } })
      .eq("user_id", userA.id)
      .eq("view_key", viewKey)
      .select();
    expect(updateResult).toEqual([]);
    const { data: prefsAfter } = await admin
      .from("view_preferences")
      .select("options")
      .eq("user_id", userA.id)
      .eq("view_key", viewKey)
      .single();
    expect(prefsAfter?.options).toEqual({ sort: "manual" });

    const { data: deleteResult } = await userB.client
      .from("view_preferences")
      .delete()
      .eq("user_id", userA.id)
      .eq("view_key", viewKey)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("view_preferences")
      .select("view_key")
      .eq("user_id", userA.id)
      .eq("view_key", viewKey)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });
});
