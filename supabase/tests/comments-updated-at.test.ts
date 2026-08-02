/**
 * Test del trigger `comments_set_updated_at_trigger`
 * (`supabase/migrations/20260729150000_comments_updated_at_trigger.sql`),
 * requirement "Un comentario editado se marca como 'editado'"
 * (`specs/comentarios/spec.md`): sin este trigger, `updated_at` se queda
 * en su default y nunca difiere de `created_at`, así que la marca
 * "editado" de `CommentItem` (`components/comments/comment-item.tsx`)
 * nunca aparece.
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
  const email = `comments-updated-at-${randomUUID()}@example.com`;
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
let taskId: string;

beforeAll(async () => {
  user = await createTestUser();

  const { data: projectData, error: projectError } = await user.client
    .from("projects")
    .insert({ user_id: user.id, name: "Proyecto de prueba (comentarios)", color: "celeste", position: 1000 })
    .select("id")
    .single();
  const project = unwrap(projectData, projectError, "Proyecto de prueba");

  const { data: taskData, error: taskError } = await user.client
    .from("tasks")
    .insert({ user_id: user.id, project_id: project.id, title: "Tarea con comentarios", position: 1000 })
    .select("id")
    .single();
  const task = unwrap(taskData, taskError, "Tarea de prueba");
  taskId = task.id;
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("comments_set_updated_at_trigger", () => {
  it("un comentario sin editar mantiene updated_at igual a created_at", async () => {
    const { data, error } = await user.client
      .from("comments")
      .insert({ user_id: user.id, task_id: taskId, content: "hola" })
      .select("created_at, updated_at")
      .single();
    const comment = unwrap(data, error, "Comentario sin editar");

    expect(comment.updated_at).toBe(comment.created_at);
  });

  it("editar el contenido actualiza updated_at, distinto de created_at", async () => {
    const { data: insertData, error: insertError } = await user.client
      .from("comments")
      .insert({ user_id: user.id, task_id: taskId, content: "primera versión" })
      .select("id, created_at, updated_at")
      .single();
    const comment = unwrap(insertData, insertError, "Comentario a editar");
    expect(comment.updated_at).toBe(comment.created_at);

    // Espacio mínimo para que now() dentro del trigger no coincida por
    // casualidad con el created_at original si el reloj no avanzó.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const { data: updateData, error: updateError } = await user.client
      .from("comments")
      .update({ content: "segunda versión" })
      .eq("id", comment.id)
      .select("created_at, updated_at")
      .single();
    const updated = unwrap(updateData, updateError, "Comentario editado");

    expect(updated.created_at).toBe(comment.created_at);
    expect(updated.updated_at).not.toBe(updated.created_at);
  });
});
