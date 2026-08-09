/**
 * Tests de `openspec/changes/enlace-de-lectura-de-un-proyecto` (tareas 2.1 a
 * 2.6 de tasks.md): la superficie más sensible del proyecto, la única
 * función `security definer` otorgada al rol anónimo. Contra el Supabase
 * local real, no contra un mock — es la única forma de probar un `grant`
 * de verdad.
 *
 * Cubre las tres reglas de D-B (design.md) una por una: la función no
 * acepta un id de proyecto, enumera las columnas a mano (test que falla si
 * un día devuelve más de lo declarado), y un token inexistente es
 * indistinguible de uno revocado. Suma D-H (archivar no revoca, borrar sí)
 * y que `regenerate_project_share_token` está acotada al dueño por RLS
 * (tarea 1.5), no por lógica propia de la función.
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
  const email = `enlace-lectura-${label}-${randomUUID()}@example.com`;
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

/** Cliente sin sesión: exactamente el rol `anon`, igual que un visitante sin cuenta abriendo el enlace público. */
function anonClient(): SupabaseClient {
  return createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

let owner: TestUser;
let other: TestUser;
let projectId: string;
let sectionId: string;
let topTaskId: string;
let subtaskId: string;
let token: string;

beforeAll(async () => {
  owner = await createTestUser("owner");
  other = await createTestUser("other");

  const { data: project, error: projectError } = await owner.client
    .from("projects")
    .insert({ user_id: owner.id, name: "Proyecto compartido", color: "celeste", icon: "🚀", position: 1000 })
    .select("id")
    .single();
  projectId = unwrap(project, projectError, "Proyecto de prueba").id;

  const { data: section, error: sectionError } = await owner.client
    .from("sections")
    .insert({ user_id: owner.id, project_id: projectId, name: "Sección A", description: "Descripción de sección", position: 1000 })
    .select("id")
    .single();
  sectionId = unwrap(section, sectionError, "Sección de prueba").id;

  const { data: topTask, error: topTaskError } = await owner.client
    .from("tasks")
    .insert({
      user_id: owner.id,
      project_id: projectId,
      section_id: sectionId,
      title: "Tarea de nivel superior",
      description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Descripción enriquecida" }] }] },
      priority: 2,
      due_date: "2026-09-01",
      deadline: "2026-09-05",
      position: 1000,
    })
    .select("id")
    .single();
  topTaskId = unwrap(topTask, topTaskError, "Tarea de prueba").id;

  const { data: subtask, error: subtaskError } = await owner.client
    .from("tasks")
    .insert({
      user_id: owner.id,
      project_id: projectId,
      section_id: sectionId,
      parent_id: topTaskId,
      title: "Subtarea",
      priority: 4,
      position: 1000,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  subtaskId = unwrap(subtask, subtaskError, "Subtarea de prueba").id;

  // Comentario, recordatorio y etiqueta sobre la tarea: lo que la vista
  // pública NUNCA tiene que devolver (D-E).
  assertOk(
    (await owner.client.from("comments").insert({ user_id: owner.id, task_id: topTaskId, content: { type: "doc", content: [] } })).error,
    "Comentario de prueba",
  );
  assertOk(
    (await owner.client.from("reminders").insert({ user_id: owner.id, task_id: topTaskId, remind_at: new Date().toISOString() })).error,
    "Recordatorio de prueba",
  );
  const { data: labelData, error: labelError } = await owner.client
    .from("labels")
    .insert({ user_id: owner.id, name: "Secreta", color: "amarillo" })
    .select("id")
    .single();
  const label = unwrap(labelData, labelError, "Etiqueta de prueba");
  assertOk(
    (await owner.client.from("task_labels").insert({ task_id: topTaskId, label_id: label.id, user_id: owner.id })).error,
    "Asignar etiqueta de prueba",
  );

  const { data: generated, error: generateError } = await owner.client.rpc("regenerate_project_share_token", {
    p_project_id: projectId,
  });
  if (generateError || !generated) {
    throw new Error(`No se pudo generar el token de prueba: ${generateError?.message}`);
  }
  token = generated;
}, 30_000);

afterAll(async () => {
  if (owner) await admin.auth.admin.deleteUser(owner.id);
  if (other) await admin.auth.admin.deleteUser(other.id);
});

describe("get_shared_project: la función otorgada al rol anónimo", () => {
  it("el rol anónimo puede leer el proyecto compartido con un token válido", async () => {
    const { data, error } = await anonClient().rpc("get_shared_project", { p_token: token });
    expect(error).toBeNull();
    expect(data).not.toBeNull();

    const shared = data as { project: Record<string, unknown>; sections: unknown[]; tasks: Record<string, unknown>[] };
    expect(shared.project.name).toBe("Proyecto compartido");
    expect(shared.sections).toHaveLength(1);
    expect(shared.tasks).toHaveLength(2);
  });

  it("no acepta un identificador de proyecto en lugar de un token (tarea 2.1)", async () => {
    const { data, error } = await anonClient().rpc("get_shared_project", { p_token: projectId });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("no devuelve comentarios, recordatorios, etiquetas ni datos de cuenta (tarea 2.2)", async () => {
    const { data } = await anonClient().rpc("get_shared_project", { p_token: token });
    const shared = data as { project: Record<string, unknown>; tasks: Record<string, unknown>[] };
    const serialized = JSON.stringify(shared);

    expect(serialized.toLowerCase()).not.toContain(owner.id.toLowerCase());
    expect(serialized).not.toContain("user_id");
    expect(serialized).not.toContain("email");

    for (const key of ["comment", "reminder", "label", "remind_at", "delivered_at", "offset_minutes"]) {
      expect(Object.keys(shared.tasks[0])).not.toContain(key);
    }
    expect(shared.project).not.toHaveProperty("user_id");
    expect(shared.project).not.toHaveProperty("id");
  });

  it("no devuelve más columnas que las declaradas — protege contra una fuga futura (tarea 2.3)", async () => {
    const { data } = await anonClient().rpc("get_shared_project", { p_token: token });
    const shared = data as {
      project: Record<string, unknown>;
      sections: Record<string, unknown>[];
      tasks: Record<string, unknown>[];
    };

    expect(Object.keys(shared.project).sort()).toEqual(["color", "icon", "name"].sort());
    expect(Object.keys(shared.sections[0]).sort()).toEqual(["description", "id", "name"].sort());
    expect(Object.keys(shared.tasks[0]).sort()).toEqual(
      ["completed", "deadline", "description", "due_at", "due_date", "id", "parent_id", "priority", "section_id", "title"].sort(),
    );
  });

  it("la subtarea viaja con parent_id apuntando a la tarea de nivel superior, y completada es un booleano", async () => {
    const { data } = await anonClient().rpc("get_shared_project", { p_token: token });
    const shared = data as { tasks: { id: string; parent_id: string | null; completed: boolean }[] };
    const sub = shared.tasks.find((t) => t.id === subtaskId)!;
    const top = shared.tasks.find((t) => t.id === topTaskId)!;
    expect(sub.parent_id).toBe(topTaskId);
    expect(sub.completed).toBe(true);
    expect(top.completed).toBe(false);
  });

  it("un token que nunca existió y un token revocado son indistinguibles (tarea 2.4)", async () => {
    const neverExisted = "token-que-nunca-existio-0123456789abcdef";
    const { data: neverData, error: neverError } = await anonClient().rpc("get_shared_project", { p_token: neverExisted });

    const { data: revokedProject } = await owner.client.from("projects").update({ share_token: null }).eq("id", projectId).select("share_token").single();
    expect(revokedProject?.share_token).toBeNull();

    const { data: revokedData, error: revokedError } = await anonClient().rpc("get_shared_project", { p_token: token });

    expect(neverError).toBeNull();
    expect(revokedError).toBeNull();
    expect(neverData).toBeNull();
    expect(revokedData).toBeNull();
  });

  it("una cuenta autenticada cualquiera no puede ejecutar la función (tarea 2.5)", async () => {
    const { data: regenerated, error: regenerateError } = await owner.client.rpc("regenerate_project_share_token", {
      p_project_id: projectId,
    });
    if (regenerateError || !regenerated) throw new Error(`No se pudo regenerar: ${regenerateError?.message}`);
    token = regenerated;

    const { data, error } = await other.client.rpc("get_shared_project", { p_token: token });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe("regenerate_project_share_token: acotada al dueño por RLS (tarea 1.5)", () => {
  it("regenerar invalida el token anterior (tarea 2.6)", async () => {
    const oldToken = token;
    const { data: newToken, error } = await owner.client.rpc("regenerate_project_share_token", { p_project_id: projectId });
    expect(error).toBeNull();
    expect(newToken).not.toBe(oldToken);

    const { data: withOldToken } = await anonClient().rpc("get_shared_project", { p_token: oldToken });
    expect(withOldToken).toBeNull();

    const { data: withNewToken } = await anonClient().rpc("get_shared_project", { p_token: newToken as string });
    expect(withNewToken).not.toBeNull();

    token = newToken as string;
  });

  it("otro usuario no puede generar el enlace de un proyecto ajeno", async () => {
    const { data, error } = await other.client.rpc("regenerate_project_share_token", { p_project_id: projectId });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("no genera un token para la Bandeja de entrada, aunque se le pase su id a mano", async () => {
    const { data: inbox, error: inboxError } = await owner.client.from("projects").select("id").eq("user_id", owner.id).eq("is_inbox", true).single();
    unwrap(inbox, inboxError, "Bandeja de la cuenta de prueba");

    const { data, error } = await owner.client.rpc("regenerate_project_share_token", { p_project_id: inbox!.id });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe("D-H: archivar no revoca, borrar sí corta el acceso", () => {
  it("archivar el proyecto mantiene el enlace funcionando", async () => {
    assertOk((await owner.client.from("projects").update({ is_archived: true }).eq("id", projectId)).error, "Archivar proyecto");

    const { data } = await anonClient().rpc("get_shared_project", { p_token: token });
    expect(data).not.toBeNull();

    assertOk((await owner.client.from("projects").update({ is_archived: false }).eq("id", projectId)).error, "Desarchivar proyecto");
  });

  it("borrar el proyecto corta el acceso por su enlace", async () => {
    assertOk((await owner.client.from("projects").delete().eq("id", projectId)).error, "Borrar proyecto");

    const { data } = await anonClient().rpc("get_shared_project", { p_token: token });
    expect(data).toBeNull();
  });
});
