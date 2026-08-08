/**
 * Tests de `claim_due_habit_reminders` (bloque 3 de
 * openspec/changes/recordatorios-de-habitos/tasks.md, D-A/D-B/D-D/D-F/D-G
 * del design): los casos borde de la regla evaluada al enviar, la ventana
 * de gracia con cota inferior, la entrega única bajo solapamiento y el
 * cruce de medianoche en una zona con desfase.
 *
 * `at` es el segundo parámetro de `claim_due_habit_reminders` (default
 * `now()`, ver el comentario de la función en
 * `20260808000000_habit_reminders.sql`): acá se fija siempre a un instante
 * exacto, mismo patrón que `habit-streak.test.ts` con
 * `calcular_racha_habito`, para que el resultado no dependa del momento en
 * que corre la suite.
 *
 * Todos los usuarios de prueba quedan con la zona horaria por default del
 * aprovisionamiento (`America/Argentina/Buenos_Aires`, UTC-3 todo el año,
 * sin horario de verano) y la hora de referencia por default (09:00): así
 * los cálculos de cada test son explícitos sin necesitar tocar
 * `user_preferences`.
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
  const email = `habit-reminders-claim-${label}-${randomUUID()}@example.com`;
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

type HabitOverrides = {
  scheduled_time?: string | null;
  frequency_type?: "daily" | "times_per_week" | "specific_days";
  days_of_week?: number[];
  is_archived?: boolean;
  created_at?: string;
};

async function createHabit(user: TestUser, name: string, overrides: HabitOverrides = {}): Promise<string> {
  const { data, error } = await admin
    .from("habits")
    .insert({
      user_id: user.id,
      name,
      icon: "✅",
      color: "verde",
      duration_minutes: 10,
      frequency_type: overrides.frequency_type ?? "daily",
      scheduled_time: overrides.scheduled_time,
      days_of_week: overrides.frequency_type === "specific_days" ? overrides.days_of_week : null,
      is_archived: overrides.is_archived ?? false,
      created_at: overrides.created_at ?? "2026-01-01T00:00:00-03:00",
    })
    .select("id")
    .single();
  return unwrap(data, error, `Hábito de prueba "${name}"`).id;
}

async function addReminder(user: TestUser, habitId: string, offsetMinutes: number): Promise<void> {
  assertOk(
    (await admin.from("habit_reminders").insert({ user_id: user.id, habit_id: habitId, offset_minutes: offsetMinutes }))
      .error,
    `Agregar recordatorio de ${habitId} (${offsetMinutes})`,
  );
}

async function addOverride(user: TestUser, habitId: string, date: string, scheduledTime: string): Promise<void> {
  assertOk(
    (
      await admin
        .from("habit_schedule_overrides")
        .insert({ user_id: user.id, habit_id: habitId, date, scheduled_time: scheduledTime })
    ).error,
    `Reprogramar ${habitId} en ${date}`,
  );
}

async function markDone(user: TestUser, habitId: string, date: string): Promise<void> {
  assertOk(
    (await admin.from("habit_completions").insert({ user_id: user.id, habit_id: habitId, completed_on: date })).error,
    `Marcar ${habitId} en ${date}`,
  );
}

async function skip(user: TestUser, habitId: string, date: string): Promise<void> {
  assertOk(
    (await admin.from("habit_skips").insert({ user_id: user.id, habit_id: habitId, date })).error,
    `Saltear ${habitId} en ${date}`,
  );
}

interface ClaimedRow {
  habit_id: string;
  user_id: string;
  name: string;
}

async function claim(at: string, p_limit = 200): Promise<ClaimedRow[]> {
  const { data, error } = await admin.rpc("claim_due_habit_reminders", { p_limit, at });
  if (error) throw new Error(`claim_due_habit_reminders en ${at}: ${error.message}`);
  return (data ?? []) as ClaimedRow[];
}

function claimedIds(rows: ClaimedRow[], habitId: string): number {
  return rows.filter((row) => row.habit_id === habitId).length;
}

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("a");
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("claim_due_habit_reminders: la regla de 'pendiente' (D-F, espejo de isHabitPendingToday + salteo)", () => {
  it("un hábito diario con recordatorio 'a la hora' se reclama en su momento", async () => {
    const habitId = await createHabit(user, "Tomar agua", { scheduled_time: "07:00:00" });
    await addReminder(user, habitId, 0);

    const rows = await claim("2026-08-05T07:00:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(1);
  });

  it("un hábito archivado nunca se reclama, aunque tenga recordatorio vencido", async () => {
    const habitId = await createHabit(user, "Hábito archivado", { scheduled_time: "07:00:00", is_archived: true });
    await addReminder(user, habitId, 0);

    const rows = await claim("2026-08-05T07:00:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(0);
  });

  it("un hábito ya completado ese día no se reclama", async () => {
    const habitId = await createHabit(user, "Hábito completado", { scheduled_time: "07:00:00" });
    await addReminder(user, habitId, 0);
    await markDone(user, habitId, "2026-08-05");

    const rows = await claim("2026-08-05T07:00:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(0);
  });

  it("un hábito salteado ese día no se reclama", async () => {
    const habitId = await createHabit(user, "Hábito salteado", { scheduled_time: "07:00:00" });
    await addReminder(user, habitId, 0);
    await skip(user, habitId, "2026-08-05");

    const rows = await claim("2026-08-05T07:00:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(0);
  });

  it("días específicos: no se reclama un día que no toca, sí el que toca", async () => {
    // Lunes (1), miércoles (3) y viernes (5) — el martes 2026-08-04 no le
    // toca; el miércoles 2026-08-05 sí.
    const habitId = await createHabit(user, "Días específicos", {
      scheduled_time: "07:00:00",
      frequency_type: "specific_days",
      days_of_week: [1, 3, 5],
    });
    await addReminder(user, habitId, 0);

    const martes = await claim("2026-08-04T07:00:00-03:00");
    expect(claimedIds(martes, habitId)).toBe(0);

    const miercoles = await claim("2026-08-05T07:00:00-03:00");
    expect(claimedIds(miercoles, habitId)).toBe(1);
  });

  it("no se avisa antes de la fecha de creación del hábito, sí desde ese día", async () => {
    const habitId = await createHabit(user, "Hábito recién creado", {
      scheduled_time: "07:00:00",
      created_at: "2026-08-05T12:00:00-03:00",
    });
    await addReminder(user, habitId, 0);

    // El martes 04 es anterior a la creación (miércoles 05 al mediodía).
    const antesDeCrear = await claim("2026-08-04T07:00:00-03:00");
    expect(claimedIds(antesDeCrear, habitId)).toBe(0);

    const diaDeCrear = await claim("2026-08-05T07:00:00-03:00");
    expect(claimedIds(diaDeCrear, habitId)).toBe(1);
  });

  it("una reprogramación puntual corre el aviso de ese día, sin tocar la hora habitual", async () => {
    const habitId = await createHabit(user, "Hábito reprogramado", { scheduled_time: "07:00:00" });
    await addReminder(user, habitId, -30);
    await addOverride(user, habitId, "2026-08-05", "10:00:00");

    // Con la hora habitual (07:00 - 30min = 06:30) esto no reclamaría nada;
    // con el override (10:00 - 30min = 09:30) sí.
    const rows = await claim("2026-08-05T09:30:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(1);
  });

  it("un hábito 'todo el día' calcula el desfase contra la hora de referencia del usuario", async () => {
    // `user_preferences.reference_time` por default es 09:00 (aprovisionamiento).
    const habitId = await createHabit(user, "Hábito todo el día", { scheduled_time: null });
    await addReminder(user, habitId, -15);

    const rows = await claim("2026-08-05T08:45:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(1);
  });
});

describe("claim_due_habit_reminders: cruce de medianoche en zona con desfase (tarea 3.2)", () => {
  it("un hábito de las 23:30 con 'días específicos' se evalúa contra el día LOCAL, no el día UTC", async () => {
    // 2026-08-05T22:30:00-03:00 (miércoles, ART) es 2026-08-06T01:30:00Z
    // (jueves, UTC): si la función usara la fecha en UTC en vez de la del
    // usuario, un hábito que solo toca los miércoles no se reclamaría acá.
    const habitId = await createHabit(user, "Hábito nocturno", {
      scheduled_time: "23:30:00",
      frequency_type: "specific_days",
      days_of_week: [3], // solo miércoles
    });
    await addReminder(user, habitId, -60); // 1 hora antes: 22:30 local

    const rows = await claim("2026-08-05T22:30:00-03:00");
    expect(claimedIds(rows, habitId)).toBe(1);
  });
});

describe("claim_due_habit_reminders: ventana de gracia de 15 minutos (D-D, tarea 3.4)", () => {
  it("un aviso vencido hace 10 minutos se envía; uno vencido hace 20 no", async () => {
    const habitReciente = await createHabit(user, "Vencido hace 10 minutos", { scheduled_time: "09:50:00" });
    await addReminder(user, habitReciente, 0);

    const habitViejo = await createHabit(user, "Vencido hace 20 minutos", { scheduled_time: "09:40:00" });
    await addReminder(user, habitViejo, 0);

    const rows = await claim("2026-08-05T10:00:00-03:00");
    expect(claimedIds(rows, habitReciente)).toBe(1);
    expect(claimedIds(rows, habitViejo)).toBe(0);
  });
});

describe("claim_due_habit_reminders: entrega única bajo solapamiento (D-B, tarea 3.3)", () => {
  it("dos llamadas concurrentes con el mismo `at` reclaman el aviso una sola vez", async () => {
    const habitId = await createHabit(user, "Entrega única", { scheduled_time: "07:00:00" });
    await addReminder(user, habitId, 0);

    const at = "2026-08-05T07:00:00-03:00";
    const [rowsA, rowsB] = await Promise.all([claim(at), claim(at)]);

    const total = claimedIds(rowsA, habitId) + claimedIds(rowsB, habitId);
    expect(total).toBe(1);

    const { data: delivery } = await admin
      .from("habit_reminder_deliveries")
      .select("delivered_at")
      .eq("habit_id", habitId)
      .eq("date", "2026-08-05")
      .eq("offset_minutes", 0)
      .maybeSingle();
    expect(delivery).not.toBeNull();

    // Una tercera llamada, ya sin nada pendiente para este hábito, no
    // vuelve a reclamarlo: un envío fallido posterior al reclamo no se
    // reintenta.
    const rowsC = await claim(at);
    expect(claimedIds(rowsC, habitId)).toBe(0);
  });
});

describe("claim_due_habit_reminders: permisos (tarea 3.5)", () => {
  it("no es ejecutable por una cuenta autenticada", async () => {
    const { data, error } = await user.client.rpc("claim_due_habit_reminders", {
      p_limit: 10,
      at: "2026-08-05T07:00:00-03:00",
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
