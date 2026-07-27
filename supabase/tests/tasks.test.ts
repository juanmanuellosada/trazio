/**
 * Tests de base de datos del bloque 7 (tareas), contra el Supabase local
 * real: que `due_date` y `due_at` sean excluyentes (constraint de la
 * migración `20260726011609_tasks.sql`), que mover una tarea a un proyecto
 * de otro usuario sea rechazado por `tasks_validate_owner_trigger`, y que
 * `duplicateTaskTree` (`lib/tasks/duplicate.ts`, F2 del design) copie los
 * campos propios y las subtareas recursivamente.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { duplicateTaskTree } from "@/lib/tasks/duplicate";
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
  const email = `tareas-${label}-${randomUUID()}@example.com`;
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

async function createProject(user: TestUser, name: string) {
  return user.client
    .from("projects")
    .insert({ user_id: user.id, name, color: "celeste", position: 1000 })
    .select("id")
    .single();
}

let user: TestUser;
let otherUser: TestUser;

beforeAll(async () => {
  [user, otherUser] = await Promise.all([createTestUser("a"), createTestUser("b")]);
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
  if (otherUser) await admin.auth.admin.deleteUser(otherUser.id);
});

describe("due_date y due_at son excluyentes (spec de tareas)", () => {
  it("rechaza guardar las dos a la vez", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para fechas");
    const project = unwrap(projectData, projectError, "Proyecto para fechas");

    const { error } = await user.client.from("tasks").insert({
      user_id: user.id,
      project_id: project.id,
      title: "Tarea con las dos fechas",
      due_date: "2026-08-01",
      due_at: "2026-08-01T10:00:00Z",
      position: 1000,
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/due_date_or_due_at_exclusive/i);
  });

  it("acepta cualquiera de las dos por separado", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para fechas (ok)");
    const project = unwrap(projectData, projectError, "Proyecto para fechas (ok)");

    const { error: onlyDate } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: project.id, title: "Solo due_date", due_date: "2026-08-01", position: 1000 });
    expect(onlyDate).toBeNull();

    const { error: onlyAt } = await user.client.from("tasks").insert({
      user_id: user.id,
      project_id: project.id,
      title: "Solo due_at",
      due_at: "2026-08-01T10:00:00Z",
      position: 2000,
    });
    expect(onlyAt).toBeNull();
  });
});

describe("Mover una tarea a un proyecto ajeno (bloque 7.7)", () => {
  it("lo rechaza el trigger de validación de dueño", async () => {
    const { data: myProjectData, error: myProjectError } = await createProject(user, "Mi proyecto");
    const myProject = unwrap(myProjectData, myProjectError, "Mi proyecto");
    const { data: taskData, error: taskError } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: myProject.id, title: "Tarea propia", position: 1000 })
      .select("id")
      .single();
    const task = unwrap(taskData, taskError, "Tarea propia");
    const { data: foreignProjectData, error: foreignProjectError } = await createProject(
      otherUser,
      "Proyecto ajeno",
    );
    const foreignProject = unwrap(foreignProjectData, foreignProjectError, "Proyecto ajeno");

    const { error } = await user.client.from("tasks").update({ project_id: foreignProject.id }).eq("id", task.id);

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/no pertenece al usuario/i);

    const { data: taskAfter } = await user.client.from("tasks").select("project_id").eq("id", task.id).single();
    expect(taskAfter?.project_id).toBe(myProject.id);
  });
});

describe("Duplicar una tarea (bloque 7.6, F2 del design)", () => {
  it("copia los campos propios, no hereda completed_at, y copia las subtareas recursivamente", async () => {
    const { data: projectData, error: projectError } = await createProject(user, "Proyecto para duplicar");
    const project = unwrap(projectData, projectError, "Proyecto para duplicar");
    const { data: originalData, error: originalError } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: project.id, title: "Original", priority: 2, due_date: "2026-08-05", position: 1000 })
      .select("id")
      .single();
    const original = unwrap(originalData, originalError, "Original");
    const { error: subtask1Error } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: project.id, parent_id: original.id, title: "Subtarea 1", position: 1000 });
    assertOk(subtask1Error, "Subtarea 1");
    const { error: subtask2Error } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: project.id, parent_id: original.id, title: "Subtarea 2", position: 2000 });
    assertOk(subtask2Error, "Subtarea 2");
    // La original queda completada, para probar que la copia nace pendiente.
    const { error: completeError } = await user.client
      .from("tasks")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", original.id);
    assertOk(completeError, "Marcar la original como completada");

    const newId = await duplicateTaskTree(user.client, original.id, 1500);

    const { data: copy } = await user.client
      .from("tasks")
      .select("title, priority, due_date, completed_at, position, created_at")
      .eq("id", newId)
      .single();
    expect(copy?.title).toBe("Original");
    expect(copy?.priority).toBe(2);
    expect(copy?.due_date).toBe("2026-08-05");
    expect(copy?.completed_at).toBeNull();
    expect(copy?.position).toBe(1500);

    const { data: originalRow } = await user.client.from("tasks").select("created_at").eq("id", original.id).single();
    expect(copy?.created_at).not.toBe(originalRow?.created_at);

    const { data: copySubtasks } = await user.client
      .from("tasks")
      .select("title")
      .eq("parent_id", newId)
      .order("position", { ascending: true });
    expect(copySubtasks?.map((t) => t.title)).toEqual(["Subtarea 1", "Subtarea 2"]);
  });
});
