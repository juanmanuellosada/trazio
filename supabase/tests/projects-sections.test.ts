/**
 * Tests de base de datos del bloque 6 (proyectos y secciones), contra el
 * Supabase local real: el tope de 3 niveles de anidamiento, que un proyecto
 * no pueda ser su propio ancestro, que la Bandeja de entrada no se pueda
 * borrar ni archivar (tarea 3.5/6.7), que borrar una sección no borre sus
 * tareas (tarea 6.9) y que borrar una etiqueta la quite de las tareas que
 * la tenían (tarea 6.10).
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  id: string;
  client: SupabaseClient;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `proyectos-secciones-${label}-${randomUUID()}@example.com`;
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

async function createProject(user: TestUser, name: string, parentId: string | null = null) {
  return user.client
    .from("projects")
    .insert({ user_id: user.id, name, color: "celeste", position: 1000, parent_id: parentId })
    .select("id")
    .single();
}

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("a");
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("Anidamiento de proyectos (bloque 6.3)", () => {
  it("permite hasta el tercer nivel y rechaza el cuarto", async () => {
    const { data: root, error: rootError } = await createProject(user, "Nivel 1");
    expect(rootError).toBeNull();

    const { data: level2, error: level2Error } = await createProject(user, "Nivel 2", root!.id);
    expect(level2Error).toBeNull();

    const { data: level3, error: level3Error } = await createProject(user, "Nivel 3", level2!.id);
    expect(level3Error).toBeNull();

    const { error: level4Error } = await createProject(user, "Nivel 4", level3!.id);
    expect(level4Error).not.toBeNull();
    expect(level4Error?.message).toMatch(/3 niveles/i);
  });

  it("rechaza que un proyecto sea su propio ancestro", async () => {
    const { data: parent } = await createProject(user, "Padre para ciclo");
    const { data: child } = await createProject(user, "Hijo para ciclo", parent!.id);

    const { error } = await user.client
      .from("projects")
      .update({ parent_id: child!.id })
      .eq("id", parent!.id);

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/su propio ancestro/i);
  });
});

describe("Protección de la Bandeja de entrada (bloque 6.7)", () => {
  it("rechaza borrar la Bandeja, aunque se intente directo en la base", async () => {
    const { data: inbox } = await user.client.from("projects").select("id").eq("is_inbox", true).single();

    const { error } = await user.client.from("projects").delete().eq("id", inbox!.id);
    expect(error).not.toBeNull();

    const { data: stillThere } = await admin.from("projects").select("id").eq("id", inbox!.id).maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("rechaza archivar la Bandeja", async () => {
    const { data: inbox } = await user.client.from("projects").select("id").eq("is_inbox", true).single();

    const { error } = await user.client.from("projects").update({ is_archived: true }).eq("id", inbox!.id);
    expect(error).not.toBeNull();

    const { data: after } = await admin.from("projects").select("is_archived").eq("id", inbox!.id).single();
    expect(after?.is_archived).toBe(false);
  });
});

describe("Eliminar una sección (bloque 6.8/6.9)", () => {
  it("no borra sus tareas: quedan sin sección, en el mismo proyecto", async () => {
    const { data: project } = await createProject(user, "Proyecto con sección a borrar");
    const { data: section } = await user.client
      .from("sections")
      .insert({ user_id: user.id, project_id: project!.id, name: "Sección temporal", position: 1000 })
      .select("id")
      .single();
    const { data: task } = await user.client
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: project!.id,
        section_id: section!.id,
        title: "Tarea que debe sobrevivir",
        position: 1000,
      })
      .select("id")
      .single();

    const { error: deleteError } = await user.client.from("sections").delete().eq("id", section!.id);
    expect(deleteError).toBeNull();

    const { data: taskAfter } = await user.client
      .from("tasks")
      .select("id, project_id, section_id")
      .eq("id", task!.id)
      .single();
    expect(taskAfter).not.toBeNull();
    expect(taskAfter?.project_id).toBe(project!.id);
    expect(taskAfter?.section_id).toBeNull();
  });
});

describe("Eliminar una etiqueta (bloque 6.10)", () => {
  it("la quita de todas las tareas donde estaba asignada", async () => {
    const { data: project } = await createProject(user, "Proyecto para etiqueta");
    const { data: task } = await user.client
      .from("tasks")
      .insert({ user_id: user.id, project_id: project!.id, title: "Tarea etiquetada", position: 1000 })
      .select("id")
      .single();
    const { data: label } = await user.client
      .from("labels")
      .insert({ user_id: user.id, name: `borrar-${randomUUID().slice(0, 8)}`, color: "indigo" })
      .select("id")
      .single();
    await user.client.from("task_labels").insert({ user_id: user.id, task_id: task!.id, label_id: label!.id });

    const { error: deleteError } = await user.client.from("labels").delete().eq("id", label!.id);
    expect(deleteError).toBeNull();

    const { data: assignmentAfter } = await user.client
      .from("task_labels")
      .select("task_id")
      .eq("task_id", task!.id)
      .eq("label_id", label!.id);
    expect(assignmentAfter).toEqual([]);
  });
});
