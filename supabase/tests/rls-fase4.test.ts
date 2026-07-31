/**
 * Tests de RLS para `calendar_connections` (tarea 1.6 de
 * openspec/changes/fase-4-calendario/tasks.md). Mismo patrón que
 * supabase/tests/rls-fase3.test.ts: dos usuarios reales contra el Supabase
 * local (Docker), verificando que uno no pueda leer, insertar en nombre del
 * otro, actualizar ni borrar la conexión del otro.
 *
 * El valor de `refresh_token` acá es un string cualquiera, no un ciphertext
 * real: estos tests verifican aislamiento entre usuarios, no cifrado — eso
 * lo cubre lib/calendar/crypto.test.ts.
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
  const email = `rls-fase4-${label}-${randomUUID()}@example.com`;
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

let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  userA = await createTestUser("a");
  userB = await createTestUser("b");

  const { error } = await userA.client
    .from("calendar_connections")
    .insert({ user_id: userA.id, refresh_token: "ciphertext-de-prueba-de-a" });
  unwrap({}, error, "Conexión de prueba de A");
}, 30_000);

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

describe("RLS: aislamiento entre usuarios (calendar_connections)", () => {
  it("B no puede leer, insertar en nombre de A, actualizar ni borrar la conexión de A", async () => {
    const { data: readAsB } = await userB.client
      .from("calendar_connections")
      .select("user_id")
      .eq("user_id", userA.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("calendar_connections")
      .insert({ user_id: userA.id, refresh_token: "ciphertext-suplantado" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("calendar_connections")
      .update({ status: "needs_reauth" })
      .eq("user_id", userA.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client
      .from("calendar_connections")
      .delete()
      .eq("user_id", userA.id)
      .select();
    expect(deleteResult).toEqual([]);

    const { data: stillThere } = await admin
      .from("calendar_connections")
      .select("user_id")
      .eq("user_id", userA.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("B puede crear y leer su propia conexión", async () => {
    const { error: insertError } = await userB.client
      .from("calendar_connections")
      .insert({ user_id: userB.id, refresh_token: "ciphertext-de-prueba-de-b" });
    expect(insertError).toBeNull();

    const { data: ownRow } = await userB.client
      .from("calendar_connections")
      .select("user_id")
      .eq("user_id", userB.id)
      .maybeSingle();
    expect(ownRow?.user_id).toBe(userB.id);
  });
});
