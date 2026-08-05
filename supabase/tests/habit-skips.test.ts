/**
 * Tests de `habit_skips` (grupo 6 de
 * openspec/changes/calendario-legible-y-manipulable/tasks.md, D-F): RLS
 * entre usuarios, mismo patrón que `rls-fase3.test.ts`, y el par que
 * importa de la decisión del dueño — "si en un hábito me salteé un día,
 * ese día queda ahí fijo en el calendario. Si yo después lo completo se
 * actualiza la racha": saltear un día no cambia `calcular_racha_habito`, y
 * completar después de saltear sí, igual que cualquier otro día.
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
  const email = `habit-skips-${label}-${randomUUID()}@example.com`;
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

async function createHabit(user: TestUser, createdAt: string): Promise<string> {
  const { data, error } = await user.client
    .from("habits")
    .insert({
      user_id: user.id,
      name: "Hábito de prueba",
      icon: "✅",
      color: "verde",
      duration_minutes: 10,
      frequency_type: "daily",
      created_at: createdAt,
    })
    .select("id")
    .single();
  return unwrap(data, error, "Hábito de prueba").id;
}

async function skip(user: TestUser, habitId: string, date: string): Promise<void> {
  assertOk(
    (await user.client.from("habit_skips").insert({ user_id: user.id, habit_id: habitId, date })).error,
    `Saltear ${habitId} en ${date}`,
  );
}

async function unskip(user: TestUser, habitId: string, date: string): Promise<void> {
  assertOk(
    (await user.client.from("habit_skips").delete().eq("habit_id", habitId).eq("date", date)).error,
    `Revertir el salteo de ${habitId} en ${date}`,
  );
}

async function mark(user: TestUser, habitId: string, completedOn: string): Promise<void> {
  assertOk(
    (await user.client.from("habit_completions").insert({ user_id: user.id, habit_id: habitId, completed_on: completedOn }))
      .error,
    `Marcar ${habitId} en ${completedOn}`,
  );
}

interface StreakRow {
  current_streak: number;
  best_streak: number;
}

async function streak(user: TestUser, habitId: string, at: string): Promise<StreakRow> {
  const { data, error } = await user.client.rpc("calcular_racha_habito", { p_habit_id: habitId, at }).single();
  return unwrap(data, error, `Racha de ${habitId} en ${at}`) as StreakRow;
}

let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  userA = await createTestUser("a");
  userB = await createTestUser("b");
}, 30_000);

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

describe("RLS: aislamiento entre usuarios (habit_skips)", () => {
  it("B no puede leer, insertar en nombre de A, actualizar ni borrar el salteo de A", async () => {
    const habitId = await createHabit(userA, "2026-07-01T00:00:00-03:00");
    await skip(userA, habitId, "2026-08-05");

    const { data: readAsB } = await userB.client
      .from("habit_skips")
      .select("date")
      .eq("habit_id", habitId)
      .eq("date", "2026-08-05");
    expect(readAsB).toEqual([]);

    const { error: insertError } = await userB.client
      .from("habit_skips")
      .insert({ user_id: userA.id, habit_id: habitId, date: "2026-08-06" });
    expect(insertError).not.toBeNull();

    // B intenta apropiarse de la fila de A cambiando el dueño, no un dato cualquiera:
    // `habit_skips` no tiene otra columna mutable fuera de la clave primaria.
    const { data: updateResult } = await userB.client
      .from("habit_skips")
      .update({ user_id: userB.id })
      .eq("habit_id", habitId)
      .eq("date", "2026-08-05")
      .select();
    expect(updateResult).toEqual([]);

    const { data: deleteResult } = await userB.client
      .from("habit_skips")
      .delete()
      .eq("habit_id", habitId)
      .eq("date", "2026-08-05")
      .select();
    expect(deleteResult).toEqual([]);

    const { data: stillThere } = await admin
      .from("habit_skips")
      .select("date, user_id")
      .eq("habit_id", habitId)
      .eq("date", "2026-08-05")
      .maybeSingle();
    expect(stillThere).toEqual({ date: "2026-08-05", user_id: userA.id });
  });
});

describe("Saltear un hábito no toca la racha (D-F, tarea 6.5)", () => {
  it("saltear un día no cambia la racha actual ni la mejor", async () => {
    const habitId = await createHabit(userA, "2026-07-01T00:00:00-03:00");
    await mark(userA, habitId, "2026-07-29");
    await mark(userA, habitId, "2026-07-30");
    await mark(userA, habitId, "2026-07-31");

    // "Hoy" (2026-08-01) todavía no tiene marca: por el margen de gracia
    // del día en curso, no corta la racha de los tres días anteriores.
    const before = await streak(userA, habitId, "2026-08-01T10:00:00-03:00");
    expect(before.current_streak).toBe(3);
    expect(before.best_streak).toBe(3);

    await skip(userA, habitId, "2026-08-01");

    const after = await streak(userA, habitId, "2026-08-01T10:00:00-03:00");
    expect(after.current_streak).toBe(before.current_streak);
    expect(after.best_streak).toBe(before.best_streak);
  });

  it("completar después de saltear actualiza la racha, igual que cualquier otro día", async () => {
    const habitId = await createHabit(userA, "2026-07-01T00:00:00-03:00");
    await mark(userA, habitId, "2026-07-30");
    await mark(userA, habitId, "2026-07-31");
    await skip(userA, habitId, "2026-08-01");

    expect((await streak(userA, habitId, "2026-08-01T10:00:00-03:00")).current_streak).toBe(2);

    // Camino de la app al completar un día salteado (`useMarkHabitDone`,
    // lib/habits/mutations.ts): marca el día y borra el salteo, en ese
    // orden.
    await mark(userA, habitId, "2026-08-01");
    await unskip(userA, habitId, "2026-08-01");

    expect((await streak(userA, habitId, "2026-08-01T10:00:00-03:00")).current_streak).toBe(3);
  });
});
