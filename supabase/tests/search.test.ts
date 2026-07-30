/**
 * Tests de búsqueda (tarea 2.19 de openspec/changes/fase-2-potencia/tasks.md,
 * capacidad `buscador`): "reunion" encuentra "reunión", "reuniones" también
 * (stemming), y "renuion" (con error de tipeo) no encuentra nada. Mismo
 * mecanismo que `lib/search/use-search.ts` (`.textSearch` sobre
 * `search_vector` con la configuración `spanish_unaccent`), contra el
 * Supabase local real — no una aproximación en memoria.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y el stack local ya
 * levantado.
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
  const email = `search-${label}-${randomUUID()}@example.com`;
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

let user: TestUser;
let projectId: string;
let reunionTaskId: string;

async function searchAs(client: SupabaseClient, term: string) {
  const { data, error } = await client
    .from("tasks")
    .select("id, title")
    .textSearch("search_vector", term, { type: "plain", config: "spanish_unaccent" });
  return { data: data ?? [], error };
}

beforeAll(async () => {
  user = await createTestUser("a");

  const { data: projectData, error: projectError } = await user.client
    .from("projects")
    .insert({ user_id: user.id, name: "Proyecto de búsqueda", color: "celeste", position: 1000 })
    .select("id")
    .single();
  projectId = unwrap(projectData, projectError, "Proyecto de búsqueda").id;

  const { data: taskData, error: taskError } = await user.client
    .from("tasks")
    .insert({ user_id: user.id, project_id: projectId, title: "Reunión de equipo", position: 1000 })
    .select("id")
    .single();
  reunionTaskId = unwrap(taskData, taskError, "Reunión de equipo").id;
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("buscador: insensible a acentos y con stemming, nunca corrección de tipeos", () => {
  it('"reunion" (sin tilde) encuentra "Reunión"', async () => {
    const { data, error } = await searchAs(user.client, "reunion");
    expect(error).toBeNull();
    expect(data.map((t) => t.id)).toContain(reunionTaskId);
  });

  it('"reuniones" (plural) encuentra "Reunión" por stemming', async () => {
    const { data, error } = await searchAs(user.client, "reuniones");
    expect(error).toBeNull();
    expect(data.map((t) => t.id)).toContain(reunionTaskId);
  });

  it('"renuion" (con error de tipeo) no encuentra nada', async () => {
    const { data, error } = await searchAs(user.client, "renuion");
    expect(error).toBeNull();
    expect(data.map((t) => t.id)).not.toContain(reunionTaskId);
  });
});
