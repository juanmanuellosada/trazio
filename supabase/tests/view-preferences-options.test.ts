/**
 * Persistencia de las opciones de vista (tarea 6.12 de
 * openspec/changes/fase-2-potencia/tasks.md, capacidad `opciones-de-vista`):
 * las opciones sobreviven a recargar y aparecen en otro dispositivo, y una
 * `view_key` sin fila usa los defaults. El aislamiento por usuario
 * (RLS) ya lo cubre `supabase/tests/rls-fase2.test.ts` (tarea 1.12); este
 * archivo cubre el comportamiento de lectura/escritura que usan
 * `lib/view-options/get-view-preferences.ts` y `lib/view-options/mutations.ts`.
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
  password: string;
}

async function createTestUser(label: string): Promise<TestUser> {
  const email = `view-preferences-${label}-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba "${label}": ${error?.message}`);
  }

  return { id: data.user.id, email, password };
}

/** Un cliente autenticado nuevo para el mismo usuario, simulando otro dispositivo/sesión. */
async function signIn(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  return client;
}

describe("view_preferences: persistencia de opciones de vista (bloque 6.12)", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser("persistencia");
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(user.id);
  });

  it("una view_key sin fila devuelve null (la aplicación completa con los defaults)", async () => {
    const client = await signIn(user);
    const { data, error } = await client
      .from("view_preferences")
      .select("options")
      .eq("user_id", user.id)
      .eq("view_key", `proyecto:${randomUUID()}`)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("guardar una opción y volver a leerla con otro cliente de la misma cuenta (otro dispositivo) trae el mismo valor", async () => {
    const viewKey = `proyecto:${randomUUID()}`;
    const clientA = await signIn(user);

    const { error: upsertError } = await clientA
      .from("view_preferences")
      .upsert({ user_id: user.id, view_key: viewKey, options: { order: "fecha", groupBy: "prioridad" } }, { onConflict: "user_id,view_key" });
    expect(upsertError).toBeNull();

    const clientB = await signIn(user);
    const { data, error } = await clientB
      .from("view_preferences")
      .select("options")
      .eq("user_id", user.id)
      .eq("view_key", viewKey)
      .single();
    expect(error).toBeNull();
    expect(data?.options).toEqual({ order: "fecha", groupBy: "prioridad" });
  });

  it("un segundo upsert sobre la misma view_key actualiza la fila en vez de duplicarla (sobrevive a recargar)", async () => {
    const viewKey = `proyecto:${randomUUID()}`;
    const client = await signIn(user);

    await client
      .from("view_preferences")
      .upsert({ user_id: user.id, view_key: viewKey, options: { order: "manual" } }, { onConflict: "user_id,view_key" });
    const { error: secondUpsertError } = await client
      .from("view_preferences")
      .upsert({ user_id: user.id, view_key: viewKey, options: { order: "manual", showCompleted: false } }, { onConflict: "user_id,view_key" });
    expect(secondUpsertError).toBeNull();

    const { data: rows, error } = await client.from("view_preferences").select("options").eq("user_id", user.id).eq("view_key", viewKey);
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0].options).toEqual({ order: "manual", showCompleted: false });
  });
});
