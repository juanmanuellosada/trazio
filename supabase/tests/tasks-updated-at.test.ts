/**
 * Test del trigger `tasks_set_updated_at_trigger`
 * (`supabase/migrations/20260729160000_tasks_updated_at_trigger.sql`): sin
 * este trigger, `updated_at` se queda en su default y nunca difiere de
 * `created_at`, aunque la tarea se edite — el mismo bug que tenía
 * `comments` antes de `20260729150000_comments_updated_at_trigger.sql`.
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

async function createTestUser(): Promise<TestUser> {
  const email = `tasks-updated-at-${randomUUID()}@example.com`;
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
    .insert({ user_id: user.id, name: "Proyecto de prueba (tareas)", color: "celeste", position: 1000 })
    .select("id")
    .single();
  const project = unwrap(projectData, projectError, "Proyecto de prueba");
  projectId = project.id;
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("tasks_set_updated_at_trigger", () => {
  it("una tarea sin editar mantiene updated_at igual a created_at", async () => {
    const { data, error } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: projectId, title: "Sacar la basura", position: 1000 })
      .select("created_at, updated_at")
      .single();
    const task = unwrap(data, error, "Tarea sin editar");

    expect(task.updated_at).toBe(task.created_at);
  });

  it("editar el título actualiza updated_at, distinto de created_at", async () => {
    const { data: insertData, error: insertError } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: projectId, title: "Primer título", position: 1001 })
      .select("id, created_at, updated_at")
      .single();
    const task = unwrap(insertData, insertError, "Tarea a editar");
    expect(task.updated_at).toBe(task.created_at);

    // Espacio mínimo para que now() dentro del trigger no coincida por
    // casualidad con el created_at original si el reloj no avanzó.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { data: updateData, error: updateError } = await user.client
      .from("tasks")
      .update({ title: "Segundo título" })
      .eq("id", task.id)
      .select("created_at, updated_at")
      .single();
    const updated = unwrap(updateData, updateError, "Tarea editada");

    expect(updated.created_at).toBe(task.created_at);
    expect(updated.updated_at).not.toBe(updated.created_at);
  });
});
