/**
 * Tests de RLS para las tres tablas nuevas de fase 3 (tarea 1.13 de
 * openspec/changes/fase-3-habitos/tasks.md): habits, habit_completions y
 * habit_schedule_overrides. Mismo patrón que supabase/tests/rls-fase2.test.ts:
 * dos usuarios reales contra el Supabase local (Docker), verificando que uno
 * no pueda leer, insertar en nombre del otro, actualizar ni borrar sus filas.
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
  const email = `rls-fase3-${label}-${randomUUID()}@example.com`;
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

interface Fixtures {
  habitId: string;
}

/** Crea, con el propio cliente autenticado del usuario, un hábito diario. */
async function createFixtures(user: TestUser): Promise<Fixtures> {
  const { data: habitData, error: habitError } = await user.client
    .from("habits")
    .insert({
      user_id: user.id,
      name: "Hábito de prueba",
      icon: "✅",
      color: "verde",
      duration_minutes: 10,
      frequency_type: "daily",
    })
    .select("id")
    .single();
  const habit = unwrap(habitData, habitError, "Hábito de prueba");

  return { habitId: habit.id };
}

let userA: TestUser;
let userB: TestUser;
let fixturesA: Fixtures;

beforeAll(async () => {
  userA = await createTestUser("a");
  userB = await createTestUser("b");
  fixturesA = await createFixtures(userA);
  // B necesita su propio hábito para que las políticas de RLS tengan algo
  // real que aislar; ningún test referencia su id directamente.
  await createFixtures(userB);
}, 30_000);

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

describe("RLS: aislamiento entre usuarios (tablas de fase 3)", () => {
  it("habits: B no puede leer, insertar en nombre de A, actualizar ni borrar el hábito de A", async () => {
    const { data: readAsB } = await userB.client.from("habits").select("id").eq("id", fixturesA.habitId);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client.from("habits").insert({
      user_id: userA.id,
      name: "Suplantado",
      icon: "✅",
      color: "verde",
      duration_minutes: 10,
      frequency_type: "daily",
    });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("habits")
      .update({ name: "Hackeado" })
      .eq("id", fixturesA.habitId)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client.from("habits").delete().eq("id", fixturesA.habitId).select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin.from("habits").select("id").eq("id", fixturesA.habitId).maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("habit_completions: B no puede leer, insertar en nombre de A, actualizar ni borrar la marca de A", async () => {
    const { data: completionData, error: completionError } = await userA.client
      .from("habit_completions")
      .insert({ user_id: userA.id, habit_id: fixturesA.habitId, completed_on: "2026-07-29" })
      .select("id")
      .single();
    const completion = unwrap(completionData, completionError, "Marca de A");

    const { data: readAsB } = await userB.client
      .from("habit_completions")
      .select("id")
      .eq("id", completion.id);
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("habit_completions")
      .insert({ user_id: userA.id, habit_id: fixturesA.habitId, completed_on: "2026-07-30" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("habit_completions")
      .update({ completed_on: "2026-07-25" })
      .eq("id", completion.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client
      .from("habit_completions")
      .delete()
      .eq("id", completion.id)
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("habit_completions")
      .select("id")
      .eq("id", completion.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("habit_schedule_overrides: B no puede leer, insertar en nombre de A, actualizar ni borrar la reprogramación de A", async () => {
    const { error: insertOwnError } = await userA.client
      .from("habit_schedule_overrides")
      .insert({ user_id: userA.id, habit_id: fixturesA.habitId, date: "2026-08-05", scheduled_time: "09:00" });
    expect(insertOwnError).toBeNull();

    const { data: readAsB } = await userB.client
      .from("habit_schedule_overrides")
      .select("date")
      .eq("habit_id", fixturesA.habitId)
      .eq("date", "2026-08-05");
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("habit_schedule_overrides")
      .insert({ user_id: userA.id, habit_id: fixturesA.habitId, date: "2026-08-06", scheduled_time: "10:00" });
    expect(insertError).not.toBeNull();

    const { data: updateResult } = await userB.client
      .from("habit_schedule_overrides")
      .update({ scheduled_time: "23:00" })
      .eq("habit_id", fixturesA.habitId)
      .eq("date", "2026-08-05")
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client
      .from("habit_schedule_overrides")
      .delete()
      .eq("habit_id", fixturesA.habitId)
      .eq("date", "2026-08-05")
      .select();
    expect(deleteResult).toEqual([]);
    const { data: stillThere } = await admin
      .from("habit_schedule_overrides")
      .select("date")
      .eq("habit_id", fixturesA.habitId)
      .eq("date", "2026-08-05")
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });
});
