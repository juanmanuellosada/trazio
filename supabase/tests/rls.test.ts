/**
 * Tests de RLS y de los triggers de integridad de fase 1 (tareas 3.11,
 * 3.12 y 3.16 de openspec/changes/fase-1-base-usable/tasks.md).
 *
 * Corren contra el Supabase local real (Docker), no contra un mock: RLS es
 * una política de Postgres, no algo que se pueda simular fielmente. Cada
 * corrida crea dos usuarios nuevos con `auth.admin.createUser`, verifica
 * el aislamiento entre sus datos en las siete tablas de esta fase, y los
 * borra al final (el borrado de auth.users cascadea sobre todo lo demás).
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
  email: string;
  client: SupabaseClient;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `rls-test-${label}-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba "${label}": ${error?.message}`);
  }

  const client = createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(
      `No se pudo iniciar sesión con el usuario de prueba "${label}": ${signInError.message}`,
    );
  }

  return { id: data.user.id, email, client };
}

interface Fixtures {
  inboxProjectId: string;
  projectId: string;
  sectionId: string;
  taskId: string;
  labelId: string;
}

/** Crea, con el propio cliente autenticado del usuario, un proyecto, una
 * sección, una tarea y una etiqueta asignada, además de ubicar la Bandeja
 * que el trigger de aprovisionamiento ya creó. */
async function createFixtures(user: TestUser): Promise<Fixtures> {
  const { data: inbox, error: inboxError } = await user.client
    .from("projects")
    .select("id")
    .eq("is_inbox", true)
    .maybeSingle();
  if (inboxError || !inbox) {
    throw new Error(`Bandeja no encontrada para ${user.email}: ${inboxError?.message}`);
  }

  const { data: project, error: projectError } = await user.client
    .from("projects")
    .insert({ user_id: user.id, name: "Proyecto de prueba", color: "celeste", position: 1000 })
    .select("id")
    .single();
  if (projectError || !project) {
    throw new Error(`No se pudo crear el proyecto de prueba: ${projectError?.message}`);
  }

  const { data: section, error: sectionError } = await user.client
    .from("sections")
    .insert({
      user_id: user.id,
      project_id: project.id,
      name: "Sección de prueba",
      position: 1000,
    })
    .select("id")
    .single();
  if (sectionError || !section) {
    throw new Error(`No se pudo crear la sección de prueba: ${sectionError?.message}`);
  }

  const { data: task, error: taskError } = await user.client
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
  if (taskError || !task) {
    throw new Error(`No se pudo crear la tarea de prueba: ${taskError?.message}`);
  }

  const { data: label, error: labelError } = await user.client
    .from("labels")
    .insert({ user_id: user.id, name: `etiqueta-${randomUUID().slice(0, 8)}`, color: "magenta" })
    .select("id")
    .single();
  if (labelError || !label) {
    throw new Error(`No se pudo crear la etiqueta de prueba: ${labelError?.message}`);
  }

  const { error: taskLabelError } = await user.client
    .from("task_labels")
    .insert({ user_id: user.id, task_id: task.id, label_id: label.id });
  if (taskLabelError) {
    throw new Error(`No se pudo asignar la etiqueta a la tarea: ${taskLabelError.message}`);
  }

  return {
    inboxProjectId: inbox.id,
    projectId: project.id,
    sectionId: section.id,
    taskId: task.id,
    labelId: label.id,
  };
}

let userA: TestUser;
let userB: TestUser;
let fixturesA: Fixtures;
let fixturesB: Fixtures;

beforeAll(async () => {
  userA = await createTestUser("a");
  userB = await createTestUser("b");
  fixturesA = await createFixtures(userA);
  fixturesB = await createFixtures(userB);
}, 30_000);

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

describe("Trigger de aprovisionamiento de cuenta (3.12)", () => {
  it("crea perfil, preferencias y Bandeja al registrarse, con los defaults de B3/B4", async () => {
    for (const user of [userA, userB]) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      expect(profile, `perfil de ${user.email}`).not.toBeNull();

      const { data: prefs } = await admin
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      expect(prefs, `preferencias de ${user.email}`).not.toBeNull();
      expect(prefs?.timezone).toBe("America/Argentina/Buenos_Aires");
      expect(prefs?.theme).toBe("system");
      expect(prefs?.time_format).toBe(24);
      expect(prefs?.week_starts_on).toBe(1);
      expect(prefs?.date_format).toBe("dd/MM/yyyy");
      expect(prefs?.default_view).toBe("bandeja");

      const { data: inbox } = await admin
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_inbox", true)
        .maybeSingle();
      expect(inbox, `Bandeja de ${user.email}`).not.toBeNull();
      expect(inbox).toMatchObject({
        name: "Bandeja de entrada",
        is_inbox: true,
        color: "#283B56",
        icon: null,
        position: 0,
        parent_id: null,
      });
    }
  });

  it("es atómico: no puede existir perfil sin preferencias ni preferencias sin Bandeja", async () => {
    for (const user of [userA, userB]) {
      const { count: profileCount } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("id", user.id);
      const { count: prefsCount } = await admin
        .from("user_preferences")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const { count: inboxCount } = await admin
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_inbox", true);

      expect(profileCount).toBe(1);
      expect(prefsCount).toBe(1);
      expect(inboxCount).toBe(1);
    }
  });
});

describe("RLS: aislamiento entre usuarios", () => {
  it("profiles: B no puede leer, insertar con id ajeno, actualizar ni borrar el perfil de A", async () => {
    const { data: readAsB } = await userB.client.from("profiles").select("id").eq("id", userA.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("profiles")
      .insert({ id: randomUUID(), full_name: "Suplantado" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("profiles")
      .update({ full_name: "Hackeado" })
      .eq("id", userA.id)
      .select();
    expect(updateResult).toEqual([]);
    const { data: profileAfter } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userA.id)
      .single();
    expect(profileAfter?.full_name).not.toBe("Hackeado");

    const { data: deleteResult } = await userB.client
      .from("profiles")
      .delete()
      .eq("id", userA.id)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userA.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("user_preferences: B no puede leer, insertar con user_id ajeno, actualizar ni borrar las preferencias de A", async () => {
    const { data: readAsB } = await userB.client
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", userA.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("user_preferences")
      .insert({ user_id: randomUUID(), theme: "dark" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("user_preferences")
      .update({ theme: "dark" })
      .eq("user_id", userA.id)
      .select();
    expect(updateResult).toEqual([]);
    const { data: prefsAfter } = await admin
      .from("user_preferences")
      .select("theme")
      .eq("user_id", userA.id)
      .single();
    expect(prefsAfter?.theme).toBe("system");

    const { data: deleteResult } = await userB.client
      .from("user_preferences")
      .delete()
      .eq("user_id", userA.id)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", userA.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("projects: B no puede leer, insertar en nombre de A, actualizar ni borrar el proyecto de A", async () => {
    const { data: readAsB } = await userB.client
      .from("projects")
      .select("id")
      .eq("id", fixturesA.projectId);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("projects").insert({
      user_id: userA.id,
      name: "Proyecto suplantado",
      color: "celeste",
      position: 2000,
    });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("projects")
      .update({ name: "Hackeado" })
      .eq("id", fixturesA.projectId)
      .select();
    expect(updateResult).toEqual([]);
    const { data: projectAfter } = await admin
      .from("projects")
      .select("name")
      .eq("id", fixturesA.projectId)
      .single();
    expect(projectAfter?.name).toBe("Proyecto de prueba");

    const { data: deleteResult } = await userB.client
      .from("projects")
      .delete()
      .eq("id", fixturesA.projectId)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("projects")
      .select("id")
      .eq("id", fixturesA.projectId)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("sections: B no puede leer, insertar en nombre de A, actualizar ni borrar la sección de A", async () => {
    const { data: readAsB } = await userB.client
      .from("sections")
      .select("id")
      .eq("id", fixturesA.sectionId);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("sections").insert({
      user_id: userA.id,
      project_id: fixturesA.projectId,
      name: "Sección suplantada",
      position: 2000,
    });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("sections")
      .update({ name: "Hackeado" })
      .eq("id", fixturesA.sectionId)
      .select();
    expect(updateResult).toEqual([]);
    const { data: sectionAfter } = await admin
      .from("sections")
      .select("name")
      .eq("id", fixturesA.sectionId)
      .single();
    expect(sectionAfter?.name).toBe("Sección de prueba");

    const { data: deleteResult } = await userB.client
      .from("sections")
      .delete()
      .eq("id", fixturesA.sectionId)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("sections")
      .select("id")
      .eq("id", fixturesA.sectionId)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("tasks: B no puede leer, insertar en nombre de A, actualizar ni borrar la tarea de A", async () => {
    const { data: readAsB } = await userB.client
      .from("tasks")
      .select("id")
      .eq("id", fixturesA.taskId);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("tasks").insert({
      user_id: userA.id,
      project_id: fixturesA.projectId,
      title: "Tarea suplantada",
      position: 2000,
    });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("tasks")
      .update({ title: "Hackeada" })
      .eq("id", fixturesA.taskId)
      .select();
    expect(updateResult).toEqual([]);
    const { data: taskAfter } = await admin
      .from("tasks")
      .select("title")
      .eq("id", fixturesA.taskId)
      .single();
    expect(taskAfter?.title).toBe("Tarea de prueba");

    const { data: deleteResult } = await userB.client
      .from("tasks")
      .delete()
      .eq("id", fixturesA.taskId)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("tasks")
      .select("id")
      .eq("id", fixturesA.taskId)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("labels: B no puede leer, insertar en nombre de A, actualizar ni borrar la etiqueta de A", async () => {
    const { data: readAsB } = await userB.client
      .from("labels")
      .select("id")
      .eq("id", fixturesA.labelId);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("labels").insert({
      user_id: userA.id,
      name: `suplantada-${randomUUID().slice(0, 8)}`,
      color: "marron",
    });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("labels")
      .update({ color: "marron" })
      .eq("id", fixturesA.labelId)
      .select();
    expect(updateResult).toEqual([]);
    const { data: labelAfter } = await admin
      .from("labels")
      .select("color")
      .eq("id", fixturesA.labelId)
      .single();
    expect(labelAfter?.color).toBe("magenta");

    const { data: deleteResult } = await userB.client
      .from("labels")
      .delete()
      .eq("id", fixturesA.labelId)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("labels")
      .select("id")
      .eq("id", fixturesA.labelId)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("task_labels: B no puede leer, insertar en nombre de A, actualizar ni borrar la asignación de A", async () => {
    const { data: readAsB } = await userB.client
      .from("task_labels")
      .select("task_id")
      .eq("task_id", fixturesA.taskId);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("task_labels").insert({
      user_id: userA.id,
      task_id: fixturesA.taskId,
      label_id: fixturesB.labelId,
    });
    expect(insertError).not.toBeNull();

    // No hay columna propia para "actualizar" sin cambiar la clave, así
    // que el intento de update ataca directamente la clave compuesta.
    const { data: updateResult } = await userB.client
      .from("task_labels")
      .update({ label_id: fixturesB.labelId })
      .eq("task_id", fixturesA.taskId)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client
      .from("task_labels")
      .delete()
      .eq("task_id", fixturesA.taskId)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("task_labels")
      .select("task_id")
      .eq("task_id", fixturesA.taskId)
      .eq("label_id", fixturesA.labelId)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });
});

describe("Trigger de validación de dueño al mover una tarea (3.11)", () => {
  it("rechaza mover la tarea de A al proyecto de B", async () => {
    const { error } = await userA.client
      .from("tasks")
      .update({ project_id: fixturesB.projectId, section_id: null })
      .eq("id", fixturesA.taskId);

    expect(error).not.toBeNull();

    const { data: taskAfter } = await admin
      .from("tasks")
      .select("project_id")
      .eq("id", fixturesA.taskId)
      .single();
    expect(taskAfter?.project_id).toBe(fixturesA.projectId);
  });

  it("rechaza mover la tarea de A a una sección de B, aunque el proyecto sea el de A", async () => {
    const { error } = await userA.client
      .from("tasks")
      .update({ section_id: fixturesB.sectionId })
      .eq("id", fixturesA.taskId);

    expect(error).not.toBeNull();

    const { data: taskAfter } = await admin
      .from("tasks")
      .select("section_id")
      .eq("id", fixturesA.taskId)
      .single();
    expect(taskAfter?.section_id).toBe(fixturesA.sectionId);
  });

  it("permite mover una tarea entre proyecto y sección propios", async () => {
    const { error } = await userA.client
      .from("tasks")
      .update({ project_id: fixturesA.inboxProjectId, section_id: null })
      .eq("id", fixturesA.taskId);

    expect(error).toBeNull();

    const { data: taskAfter } = await admin
      .from("tasks")
      .select("project_id, section_id")
      .eq("id", fixturesA.taskId)
      .single();
    expect(taskAfter?.project_id).toBe(fixturesA.inboxProjectId);
    expect(taskAfter?.section_id).toBeNull();
  });
});
