/**
 * Tests de `calcular_racha_habito` (tarea 1.14 de
 * openspec/changes/fase-3-habitos/tasks.md): los cuatro bordes que el
 * roadmap exige como criterio de aceptación de la fase —cambio de semana,
 * día en curso con margen de gracia, y hábito creado a mitad de semana—, más
 * el reinicio de la racha al desarchivar. Los escenarios reproducen, con
 * fechas fijas, los del spec `rachas-de-habitos` (nunca `now()`: un test que
 * dependa del día en que se corre pasa el martes y falla el domingo — ver
 * `at` en cada llamada al RPC, mismo patrón que buscar-tareas.test.ts).
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y el stack local ya
 * levantado.
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
  const email = `habit-streak-${label}-${randomUUID()}@example.com`;
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

interface StreakRow {
  current_streak: number;
  best_streak: number;
}

async function streak(user: TestUser, habitId: string, at: string): Promise<StreakRow> {
  const { data, error } = await user.client.rpc("calcular_racha_habito", { p_habit_id: habitId, at }).single();
  const row = unwrap(data, error, `Racha de ${habitId} en ${at}`);
  return row as StreakRow;
}

interface NewHabit {
  name: string;
  frequency_type: "daily" | "times_per_week" | "specific_days";
  times_per_week?: number;
  days_of_week?: number[];
  created_at: string;
}

async function createHabit(user: TestUser, habit: NewHabit): Promise<string> {
  const { data, error } = await user.client
    .from("habits")
    .insert({
      user_id: user.id,
      name: habit.name,
      icon: "✅",
      color: "verde",
      duration_minutes: 10,
      frequency_type: habit.frequency_type,
      times_per_week: habit.times_per_week ?? null,
      days_of_week: habit.days_of_week ?? null,
      created_at: habit.created_at,
    })
    .select("id")
    .single();
  return unwrap(data, error, `Hábito "${habit.name}"`).id;
}

async function mark(user: TestUser, habitId: string, completedOn: string): Promise<void> {
  assertOk(
    (await user.client.from("habit_completions").insert({ user_id: user.id, habit_id: habitId, completed_on: completedOn }))
      .error,
    `Marcar ${habitId} en ${completedOn}`,
  );
}

async function unmark(user: TestUser, habitId: string, completedOn: string): Promise<void> {
  assertOk(
    (await user.client.from("habit_completions").delete().eq("habit_id", habitId).eq("completed_on", completedOn)).error,
    `Desmarcar ${habitId} en ${completedOn}`,
  );
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

describe("calcular_racha_habito: 'todos los días'", () => {
  it("hoy sin marcar todavía, y el día no terminó, no corta la racha (margen de gracia)", async () => {
    const habitId = await createHabit(userA, { name: "Diario A", frequency_type: "daily", created_at: "2026-07-01T00:00:00-03:00" });
    await mark(userA, habitId, "2026-07-28");
    await mark(userA, habitId, "2026-07-29");
    await mark(userA, habitId, "2026-07-30");

    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(3);
    expect(result.best_streak).toBe(3);
  });

  it("sin marca ayer, la racha es 0", async () => {
    const habitId = await createHabit(userA, { name: "Diario B", frequency_type: "daily", created_at: "2026-07-01T00:00:00-03:00" });
    await mark(userA, habitId, "2026-07-25");

    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(0);
    expect(result.best_streak).toBe(1);
  });

  it("no evalúa fechas anteriores a la creación del hábito", async () => {
    const habitId = await createHabit(userA, { name: "Diario C", frequency_type: "daily", created_at: "2026-07-29T00:00:00-03:00" });
    await mark(userA, habitId, "2026-07-29");
    await mark(userA, habitId, "2026-07-30");
    await mark(userA, habitId, "2026-07-31");

    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(3);
    expect(result.best_streak).toBe(3);
  });

  it("la racha se calcula en cada lectura: borrar una marca antigua la cambia sin sincronización manual", async () => {
    const habitId = await createHabit(userA, { name: "Diario D", frequency_type: "daily", created_at: "2026-07-01T00:00:00-03:00" });
    await mark(userA, habitId, "2026-07-29");
    await mark(userA, habitId, "2026-07-30");
    await mark(userA, habitId, "2026-07-31");

    expect((await streak(userA, habitId, "2026-07-31T10:00:00-03:00")).current_streak).toBe(3);

    await unmark(userA, habitId, "2026-07-29");
    expect((await streak(userA, habitId, "2026-07-31T10:00:00-03:00")).current_streak).toBe(2);
  });

  it("una racha cortada en el pasado sigue siendo la mejor, aunque la actual sea menor", async () => {
    const habitId = await createHabit(userA, { name: "Diario E", frequency_type: "daily", created_at: "2026-05-01T00:00:00-03:00" });
    for (let day = 1; day <= 20; day++) {
      await mark(userA, habitId, `2026-05-${String(day).padStart(2, "0")}`);
    }
    // Gap, y una racha actual más corta que la histórica.
    await mark(userA, habitId, "2026-07-29");
    await mark(userA, habitId, "2026-07-30");

    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(2);
    expect(result.best_streak).toBe(20);
  });

  it("la racha actual, si supera a la mejor histórica, pasa a ser la mejor", async () => {
    const habitId = await createHabit(userA, { name: "Diario F", frequency_type: "daily", created_at: "2026-05-01T00:00:00-03:00" });
    for (let day = 1; day <= 5; day++) {
      await mark(userA, habitId, `2026-05-${String(day).padStart(2, "0")}`);
    }
    for (let day = 26; day <= 31; day++) {
      await mark(userA, habitId, `2026-07-${String(day).padStart(2, "0")}`);
    }

    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(6);
    expect(result.best_streak).toBe(6);
  });
});

describe("calcular_racha_habito: 'días específicos'", () => {
  const DIAS_LUN_MIE_VIE = [1, 3, 5];

  it("un día específico en curso sin marcar no corta la racha", async () => {
    const habitId = await createHabit(userA, {
      name: "Específico A",
      frequency_type: "specific_days",
      days_of_week: DIAS_LUN_MIE_VIE,
      created_at: "2026-07-01T00:00:00-03:00",
    });
    await mark(userA, habitId, "2026-07-27"); // lunes
    await mark(userA, habitId, "2026-07-29"); // miércoles
    // Hoy es viernes 07-31, día específico, sin marcar, sin haber terminado.

    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(2);
  });

  it("un día específico que ya terminó sin marca corta la racha", async () => {
    const habitId = await createHabit(userA, {
      name: "Específico B",
      frequency_type: "specific_days",
      days_of_week: DIAS_LUN_MIE_VIE,
      created_at: "2026-07-01T00:00:00-03:00",
    });
    await mark(userA, habitId, "2026-07-27"); // lunes
    await mark(userA, habitId, "2026-07-29"); // miércoles
    // El viernes 07-31 nunca se marcó, y ya terminó: hoy es sábado 08-01.

    const result = await streak(userA, habitId, "2026-08-01T10:00:00-03:00");
    expect(result.current_streak).toBe(0);
    expect(result.best_streak).toBe(2);
  });
});

describe("calcular_racha_habito: 'N veces por semana'", () => {
  it("dos semanas consecutivas y cerradas que cumplen la meta dan racha 2", async () => {
    const habitId = await createHabit(userA, {
      name: "Semanal A",
      frequency_type: "times_per_week",
      times_per_week: 3,
      created_at: "2026-06-01T00:00:00-03:00",
    });
    for (const day of ["2026-07-13", "2026-07-14", "2026-07-15"]) await mark(userA, habitId, day);
    for (const day of ["2026-07-20", "2026-07-21", "2026-07-22"]) await mark(userA, habitId, day);

    // "Hoy" cae en la semana siguiente (27/07 al 02/08), así que ambas
    // semanas de marcas ya cerraron.
    const result = await streak(userA, habitId, "2026-07-29T10:00:00-03:00");
    expect(result.current_streak).toBe(2);
    expect(result.best_streak).toBe(2);
  });

  it("una semana que no llega a la meta corta la racha, y la siguiente que cumple la reinicia en 1", async () => {
    const habitId = await createHabit(userA, {
      name: "Semanal B",
      frequency_type: "times_per_week",
      times_per_week: 3,
      created_at: "2026-06-01T00:00:00-03:00",
    });
    // Semana 07-13..19: cumple (3 marcas).
    for (const day of ["2026-07-13", "2026-07-14", "2026-07-15"]) await mark(userA, habitId, day);
    // Semana 07-20..26: solo 2 marcas, no cumple.
    for (const day of ["2026-07-20", "2026-07-21"]) await mark(userA, habitId, day);
    // Semana 07-27..08-02: cumple de nuevo, y ya cerró para "hoy" 08-05.
    for (const day of ["2026-07-27", "2026-07-28", "2026-07-29"]) await mark(userA, habitId, day);

    const result = await streak(userA, habitId, "2026-08-05T10:00:00-03:00");
    expect(result.current_streak).toBe(1);
    expect(result.best_streak).toBe(1);
  });

  it("la semana en curso se excluye de la racha aunque ya haya marcas, y no la corta", async () => {
    const habitId = await createHabit(userA, {
      name: "Semanal C",
      frequency_type: "times_per_week",
      times_per_week: 3,
      created_at: "2026-06-01T00:00:00-03:00",
    });
    for (const day of ["2026-07-13", "2026-07-14", "2026-07-15"]) await mark(userA, habitId, day);
    for (const day of ["2026-07-20", "2026-07-21", "2026-07-22"]) await mark(userA, habitId, day);
    // Semana en curso (27/07 al 02/08): una sola marca, muy por debajo de la
    // meta de 3 — no debería contar como fallida porque todavía no cerró.
    await mark(userA, habitId, "2026-07-28");

    const result = await streak(userA, habitId, "2026-07-29T10:00:00-03:00");
    expect(result.current_streak).toBe(2);
    expect(result.best_streak).toBe(2);
  });

  it("un hábito creado un jueves no falla su primera semana parcial", async () => {
    const habitId = await createHabit(userA, {
      name: "Semanal creado a mitad de semana",
      frequency_type: "times_per_week",
      times_per_week: 3,
      created_at: "2026-07-30T00:00:00-03:00", // jueves, semana 27/07..02/08
    });
    await mark(userA, habitId, "2026-07-30");

    // Todavía dentro de la semana de creación: no hay semanas cerradas para
    // evaluar, así que no cuenta como fallida.
    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(0);
    expect(result.best_streak).toBe(0);
  });

  it("la semana no usa week_starts_on: agrupa lunes a domingo aunque la preferencia del usuario sea domingo", async () => {
    assertOk(
      (await userB.client.from("user_preferences").update({ week_starts_on: 0 }).eq("user_id", userB.id)).error,
      "Cambiar week_starts_on de B a domingo",
    );
    try {
      const habitId = await createHabit(userB, {
        name: "Semanal con preferencia domingo",
        frequency_type: "times_per_week",
        times_per_week: 2,
        created_at: "2026-06-01T00:00:00-03:00",
      });
      // 19/07 es domingo, 20/07 es lunes. Si el corte fuera domingo-sábado
      // (lo que pediría week_starts_on = 0), las dos marcas caerían en la
      // misma semana y cumplirían la meta de 2. Con el corte fijo
      // lunes-domingo (D-D), caen en semanas distintas con una sola marca
      // cada una, y ninguna cumple.
      await mark(userB, habitId, "2026-07-19");
      await mark(userB, habitId, "2026-07-20");

      const result = await streak(userB, habitId, "2026-08-05T10:00:00-03:00");
      expect(result.current_streak).toBe(0);
      expect(result.best_streak).toBe(0);
    } finally {
      await userB.client.from("user_preferences").update({ week_starts_on: 1 }).eq("user_id", userB.id);
    }
  });
});

describe("calcular_racha_habito: desarchivar reinicia la racha actual, no la mejor", () => {
  it("un hábito con racha activa antes de archivarse recalcula la actual en 0 tras el período sin marcar", async () => {
    const habitId = await createHabit(userA, { name: "Para archivar", frequency_type: "daily", created_at: "2026-06-01T00:00:00-03:00" });
    for (let day = 10; day <= 19; day++) {
      await mark(userA, habitId, `2026-06-${String(day).padStart(2, "0")}`);
    }
    // Racha de 10 antes del período archivado (06-20 al 07-30 sin marcar).
    expect((await streak(userA, habitId, "2026-06-19T10:00:00-03:00")).current_streak).toBe(10);

    // Se desarchiva y se vuelve a marcar hoy: el hueco sin marcar corta la
    // continuidad, así que la racha actual arranca en 0 (o 1 si se marca
    // hoy), pero la mejor histórica se conserva.
    await mark(userA, habitId, "2026-07-31");
    const result = await streak(userA, habitId, "2026-07-31T10:00:00-03:00");
    expect(result.current_streak).toBe(1);
    expect(result.best_streak).toBe(10);
  });
});

describe("calcular_racha_habito: zona horaria del usuario", () => {
  it("dos usuarios en zonas horarias distintas ven 'hoy' en un momento distinto", async () => {
    // 23:30 UTC del 30/07: para Buenos Aires (UTC-3) todavía es 30/07; para
    // Madrid (UTC+2) ya es 31/07.
    const AT_2330_UTC = "2026-07-30T23:30:00Z";

    assertOk(
      (await userB.client.from("user_preferences").update({ timezone: "Europe/Madrid" }).eq("user_id", userB.id)).error,
      "Cambiar timezone de B a Madrid",
    );
    try {
      const habitBA = await createHabit(userA, { name: "Diario BA", frequency_type: "daily", created_at: "2026-07-01T00:00:00-03:00" });
      await mark(userA, habitBA, "2026-07-29");
      await mark(userA, habitBA, "2026-07-30");

      const habitMadrid = await createHabit(userB, { name: "Diario Madrid", frequency_type: "daily", created_at: "2026-07-01T00:00:00+02:00" });
      await mark(userB, habitMadrid, "2026-07-30");
      await mark(userB, habitMadrid, "2026-07-31");

      // Para A, "hoy" (30/07) ya tiene marca: la racha incluye hoy.
      const resultA = await streak(userA, habitBA, AT_2330_UTC);
      expect(resultA.current_streak).toBe(2);

      // Para B, "hoy" (31/07) también tiene marca: la racha incluye hoy,
      // aunque sea el mismo instante que A.
      const resultB = await streak(userB, habitMadrid, AT_2330_UTC);
      expect(resultB.current_streak).toBe(2);
    } finally {
      await userB.client.from("user_preferences").update({ timezone: "America/Argentina/Buenos_Aires" }).eq("user_id", userB.id);
    }
  });
});

describe("calcular_racha_habito: RLS activa por ser SECURITY INVOKER", () => {
  it("un usuario no puede calcular la racha de un hábito de otro", async () => {
    const habitId = await createHabit(userA, { name: "Privado de A", frequency_type: "daily", created_at: "2026-07-01T00:00:00-03:00" });
    await mark(userA, habitId, "2026-07-31");

    const { data, error } = await userB.client.rpc("calcular_racha_habito", {
      p_habit_id: habitId,
      at: "2026-07-31T10:00:00-03:00",
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
