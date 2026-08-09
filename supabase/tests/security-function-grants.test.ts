/**
 * Tests de permisos de las cuatro funciones que arregla
 * `20260809040000_security_function_grants_audit.sql`. Las dos primeras
 * son `security definer` para que el cron reclame recordatorios sin
 * sesión: pasan por encima de RLS a propósito y devuelven `user_id`,
 * `task_id` y el título de la tarea de cualquier usuario, así que un
 * `grant` de más las convierte en una fuga de datos ajenos ejecutable por
 * PostgREST con la clave publicable. `get_shared_project` ya tenía su
 * propio test de que `authenticated` no puede ejecutarla
 * (`enlace-de-lectura.test.ts`, tarea 2.5); acá se cubre el resto: que
 * `anon` tampoco puede ejecutar las de reclamo, que `service_role` sí
 * puede, y que la función de trigger de refresco de avatar no es
 * invocable por ningún rol.
 *
 * Sin estos tests, revocar solo de `public` (o solo de `anon` y
 * `authenticated`) vuelve a parecer suficiente — es exactamente el error
 * que ya se cometió dos veces en este proyecto en direcciones opuestas
 * (ver el comentario de la migración): el privilegio de PUBLIC es
 * aditivo, así que hace falta revocar de los tres roles y otorgar
 * explícitamente solo al que corresponde.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Cliente sin sesión: exactamente el rol `anon`. */
function anonClient(): SupabaseClient {
  return createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

describe("claim_due_reminders: solo service_role", () => {
  it("anon no puede ejecutarla", async () => {
    const { data, error } = await anonClient().rpc("claim_due_reminders", { p_limit: 10 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("service_role sí puede reclamar", async () => {
    const { error } = await admin.rpc("claim_due_reminders", { p_limit: 10 });
    expect(error).toBeNull();
  });
});

describe("claim_due_habit_reminders: solo service_role", () => {
  it("anon no puede ejecutarla", async () => {
    const { data, error } = await anonClient().rpc("claim_due_habit_reminders", { p_limit: 10 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("service_role sí puede reclamar", async () => {
    const { error } = await admin.rpc("claim_due_habit_reminders", { p_limit: 10 });
    expect(error).toBeNull();
  });
});

// authenticated ya está cubierto por "una cuenta autenticada cualquiera no
// puede ejecutar la función (tarea 2.5)" en enlace-de-lectura.test.ts; acá
// solo se agrega la mitad que falta: un token válido cualquiera para
// `anon` (el único rol al que la función está otorgada) no basta para que
// `authenticated` la ejecute igual.
describe("handle_user_login_avatar_refresh: no invocable como RPC", () => {
  it("ningún rol puede llamarla directamente (es un trigger, no una RPC)", async () => {
    const { data: anonData, error: anonError } = await anonClient().rpc("handle_user_login_avatar_refresh");
    expect(anonData).toBeNull();
    expect(anonError).not.toBeNull();

    const { data: adminData, error: adminError } = await admin.rpc("handle_user_login_avatar_refresh");
    expect(adminData).toBeNull();
    expect(adminError).not.toBeNull();
  });
});
