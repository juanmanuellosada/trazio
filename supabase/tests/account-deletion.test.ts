/**
 * Tests del borrado de cuenta, contra el Supabase local real: que la
 * Bandeja de entrada siga protegida contra borrado/archivado/pérdida de
 * is_inbox por acción directa del usuario (migración
 * 20260726011604_projects_inbox_protection.sql), y que borrar la fila de
 * auth.users de un usuario sí funcione, cascadeando sobre las siete tablas
 * de datos de usuario sin dejar filas huérfanas (corrección de
 * 20260727001408_projects_inbox_protection_allow_account_deletion.sql).
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
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
  const email = `borrado-cuenta-${label}-${randomUUID()}@example.com`;
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

describe("Protección de la Bandeja contra acción directa del usuario", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser("directo");
  }, 30_000);

  afterAll(async () => {
    if (user) await admin.auth.admin.deleteUser(user.id);
  });

  it("rechaza borrar, archivar o desmarcar is_inbox de la Bandeja, con la cuenta viva", async () => {
    const { data: inboxData, error: inboxError } = await user.client
      .from("projects")
      .select("id")
      .eq("is_inbox", true)
      .single();
    const inbox = unwrap(inboxData, inboxError, "Bandeja no encontrada");

    const { error: deleteError } = await user.client.from("projects").delete().eq("id", inbox.id);
    expect(deleteError).not.toBeNull();

    const { error: archiveError } = await user.client
      .from("projects")
      .update({ is_archived: true })
      .eq("id", inbox.id);
    expect(archiveError).not.toBeNull();

    const { error: unsetInboxError } = await user.client
      .from("projects")
      .update({ is_inbox: false })
      .eq("id", inbox.id);
    expect(unsetInboxError).not.toBeNull();

    const { data: stillThere } = await admin
      .from("projects")
      .select("is_inbox, is_archived")
      .eq("id", inbox.id)
      .single();
    expect(stillThere?.is_inbox).toBe(true);
    expect(stillThere?.is_archived).toBe(false);
  });
});

describe("Borrado de cuenta completo (cascada desde auth.users)", () => {
  it("borra la fila de auth.users y arrastra en cascada las siete tablas de datos, sin huérfanos", async () => {
    const user = await createTestUser("cascada");

    const { data: inboxData, error: inboxError } = await user.client
      .from("projects")
      .select("id")
      .eq("is_inbox", true)
      .single();
    const inbox = unwrap(inboxData, inboxError, "Bandeja no encontrada");
    const { data: projectData, error: projectError } = await user.client
      .from("projects")
      .insert({ user_id: user.id, name: "Proyecto de prueba", color: "celeste", position: 1000 })
      .select("id")
      .single();
    const project = unwrap(projectData, projectError, "Proyecto de prueba");
    const { data: sectionData, error: sectionError } = await user.client
      .from("sections")
      .insert({ user_id: user.id, project_id: project.id, name: "Sección de prueba", position: 1000 })
      .select("id")
      .single();
    const section = unwrap(sectionData, sectionError, "Sección de prueba");
    const { data: taskData, error: taskError } = await user.client
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: project.id,
        section_id: section.id,
        title: "Tarea de prueba",
        position: 1000,
      })
      .select("id")
      .single();
    const task = unwrap(taskData, taskError, "Tarea de prueba");
    const { data: labelData, error: labelError } = await user.client
      .from("labels")
      .insert({ user_id: user.id, name: `etiqueta-${randomUUID().slice(0, 8)}`, color: "magenta" })
      .select("id")
      .single();
    const label = unwrap(labelData, labelError, "Etiqueta de prueba");
    const { error: taskLabelError } = await user.client
      .from("task_labels")
      .insert({ user_id: user.id, task_id: task.id, label_id: label.id });
    assertOk(taskLabelError, "Asignación de etiqueta a tarea");

    // Antes de la corrección, este borrado fallaba entero porque la
    // cascada intentaba borrar la Bandeja y el trigger la rechazaba.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    expect(deleteUserError).toBeNull();

    const { count: profileCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", user.id);
    expect(profileCount).toBe(0);

    const { count: prefsCount } = await admin
      .from("user_preferences")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(prefsCount).toBe(0);

    const { count: projectsCount } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(projectsCount).toBe(0);
    // El propio id de la Bandeja, en particular, no debe sobrevivir.
    const { data: inboxAfter } = await admin.from("projects").select("id").eq("id", inbox.id).maybeSingle();
    expect(inboxAfter).toBeNull();

    const { count: sectionsCount } = await admin
      .from("sections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(sectionsCount).toBe(0);

    const { count: tasksCount } = await admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(tasksCount).toBe(0);

    const { count: labelsCount } = await admin
      .from("labels")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(labelsCount).toBe(0);

    const { count: taskLabelsCount } = await admin
      .from("task_labels")
      .select("task_id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(taskLabelsCount).toBe(0);
  }, 30_000);
});
