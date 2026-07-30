/**
 * Test de entrega única (tarea 4.17, decisión D-C de
 * `openspec/changes/fase-2-potencia/design.md`): dos ejecuciones
 * "solapadas" del cron sobre el mismo recordatorio vencido tienen que
 * producir un solo envío. Acá se simula el solapamiento llamando
 * `claim_due_reminders` (la función que la edge function invoca por
 * `rpc`, ver `supabase/migrations/20260729140000_reminders_claim_recalc_and_cron.sql`)
 * dos veces en paralelo con `Promise.all`, contra el mismo recordatorio
 * vencido: `for update skip locked` tiene que hacer que una de las dos
 * llamadas se quede sin nada, nunca que las dos reclamen la misma fila.
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

async function createTestUser(): Promise<TestUser> {
  const email = `reminders-delivery-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  }

  const client = createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión: ${signInError.message}`);
  }

  return { id: data.user.id, client };
}

let user: TestUser;
let taskId: string;

beforeAll(async () => {
  user = await createTestUser();

  const { data: projectData, error: projectError } = await user.client
    .from("projects")
    .insert({ user_id: user.id, name: "Proyecto de prueba (entrega única)", color: "celeste", position: 1000 })
    .select("id")
    .single();
  const project = unwrap(projectData, projectError, "Proyecto de prueba");

  const { data: taskData, error: taskError } = await user.client
    .from("tasks")
    .insert({ user_id: user.id, project_id: project.id, title: "Pagar el alquiler", position: 1000 })
    .select("id")
    .single();
  const task = unwrap(taskData, taskError, "Tarea de prueba");
  taskId = task.id;
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("claim_due_reminders: entrega única bajo solapamiento (tarea 4.17)", () => {
  it("dos llamadas concurrentes sobre el mismo recordatorio vencido: una sola lo reclama", async () => {
    const { data: reminderData, error: reminderError } = await user.client
      .from("reminders")
      .insert({
        user_id: user.id,
        task_id: taskId,
        remind_at: new Date(Date.now() - 60_000).toISOString(),
      })
      .select("id")
      .single();
    const reminder = unwrap(reminderData, reminderError, "Recordatorio vencido");

    const [resultA, resultB] = await Promise.all([
      admin.rpc("claim_due_reminders", { p_limit: 200 }),
      admin.rpc("claim_due_reminders", { p_limit: 200 }),
    ]);

    expect(resultA.error).toBeNull();
    expect(resultB.error).toBeNull();

    const claimedIdsA = (resultA.data ?? []).map((row: { id: string }) => row.id);
    const claimedIdsB = (resultB.data ?? []).map((row: { id: string }) => row.id);
    const totalClaims = [...claimedIdsA, ...claimedIdsB].filter((id) => id === reminder.id).length;

    // Exactamente una de las dos ejecuciones reclamó este recordatorio —
    // nunca las dos, nunca ninguna.
    expect(totalClaims).toBe(1);

    const { data: afterClaim } = await admin
      .from("reminders")
      .select("delivered_at")
      .eq("id", reminder.id)
      .single();
    expect(afterClaim?.delivered_at).not.toBeNull();

    // Una tercera llamada, ya sin nada pendiente, no vuelve a reclamarlo:
    // un envío fallido posterior al reclamo no se reintenta (D-C).
    const { data: thirdCall, error: thirdError } = await admin.rpc("claim_due_reminders", { p_limit: 200 });
    expect(thirdError).toBeNull();
    expect((thirdCall ?? []).some((row: { id: string }) => row.id === reminder.id)).toBe(false);
  });
});
