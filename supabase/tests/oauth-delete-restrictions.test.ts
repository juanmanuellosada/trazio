/**
 * Ola 4 de `servidor-mcp` (D-C de design.md, migración
 * `20260810010000_oauth_client_delete_restrictions.sql`): "el MCP no
 * borra" no depende solo de qué herramientas construimos — un token OAuth
 * filtrado, usado directo contra PostgREST, tiene que chocar con la base.
 * La política de DELETE de cada tabla bloqueada ahora exige, además de
 * `user_id = auth.uid()`, que el JWT NO traiga el claim `client_id` (una
 * sesión normal de la app nunca lo trae; un token del servidor OAuth 2.1
 * de Supabase siempre sí — verificado a mano contra el stack local antes
 * de escribir la migración, ver el comentario de cabecera del archivo).
 *
 * Qué cubre este archivo, tabla por tabla, para las 18 tablas bloqueadas
 * (`tasks`, `projects`, `sections`, `habits`, `labels`, `filters`,
 * `comments`, `habit_completions`, `habit_skips`,
 * `habit_schedule_overrides`, `reminders`, `habit_reminders`,
 * `habit_reminder_deliveries`, `push_subscriptions`,
 * `calendar_connections`, `user_preferences`, `profiles`,
 * `view_preferences`):
 *   1. Con el token OAuth, el DELETE no borra nada (0 filas afectadas, sin
 *      error explícito — así responde PostgREST cuando RLS filtra la fila
 *      antes de la sentencia, no cuando la rechaza con un 403).
 *   2. La misma fila, con la sesión normal de la app (mismo usuario, sin
 *      `client_id`), SÍ se borra — la garantía de que este cambio no le
 *      rompió nada al camino de siempre.
 *
 * Y para la única tabla que se decidió NO bloquear (`task_labels`, la
 * excepción documentada en la cabecera de la migración): que el DELETE con
 * el token OAuth sí funciona, para que nadie la bloquee después por
 * descuido pensando que "toda tabla con DELETE se bloquea".
 *
 * Un describe aparte confirma que SELECT/INSERT/UPDATE con el token OAuth
 * siguen funcionando sin cambios: esta migración toca únicamente DELETE.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";
import { unwrap } from "./helpers";
import { getOAuthAccessToken } from "./oauth";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  id: string;
  email: string;
  password: string;
}

let user: TestUser;
/** Sesión normal de la app: sin `client_id` en el token. */
let appClient: SupabaseClient;
/** Mismo usuario, pero autenticado con el access token del servidor OAuth: trae `client_id`. */
let oauthClient: SupabaseClient;

// Filas "recurso" que sirven de FK para otras tablas y nunca se borran en
// este archivo — separadas de las filas "a borrar" de cada caso, para que
// borrar (o intentar borrar) una no afecte por cascada la fixture de otra.
let resourceProject: { id: string };
let resourceTask: { id: string };
let resourceHabit: { id: string };
let labelForBridge: { id: string };

async function insertFixture<T extends Record<string, unknown>>(table: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await appClient.from(table).insert(payload).select().single();
  return unwrap(data as T | null, error, `Fixture en "${table}"`);
}

// `any`, no un genérico: encadenar `.eq()` sobre el tipo real de
// PostgrestFilterBuilder (con un `table: string` dinámico, no una tabla
// literal) hace que TypeScript intente resolver una cadena de tipos
// condicionales tan profunda que tira "Type instantiation is excessively
// deep" — el mismo build queda roto para todo el repo, no solo este
// archivo. `any` es correcto acá: el filtro se arma en runtime a partir de
// `match`, no hay nada que el tipo del builder pueda chequear de más.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMatch(builder: any, match: Record<string, unknown>): any {
  return Object.entries(match).reduce((acc, [column, value]) => acc.eq(column, value), builder);
}

beforeAll(async () => {
  const email = `oauth-delete-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  }
  user = { id: data.user.id, email, password };

  appClient = createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await appClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión de app con el usuario de prueba: ${signInError.message}`);
  }

  const oauthAccessToken = await getOAuthAccessToken(env, email, password);
  oauthClient = createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${oauthAccessToken}` } },
  });

  resourceProject = await insertFixture("projects", { user_id: user.id, name: "Proyecto recurso", color: "celeste" });
  resourceTask = await insertFixture("tasks", { user_id: user.id, project_id: resourceProject.id, title: "Tarea recurso" });
  resourceHabit = await insertFixture("habits", {
    user_id: user.id,
    name: "Hábito recurso",
    icon: "star",
    color: "celeste",
    duration_minutes: 10,
    frequency_type: "daily",
  });
  labelForBridge = await insertFixture("labels", { user_id: user.id, name: "Etiqueta puente", color: "celeste" });
}, 30_000);

afterAll(async () => {
  // Cascada desde auth.users (on delete cascade en cada tabla): borra
  // también todas las filas de este usuario en las 19 tablas, sin
  // necesidad de un cleanup manual por tabla.
  if (user) await admin.auth.admin.deleteUser(user.id);
});

interface BlockedCase {
  table: string;
  insert: () => Promise<Record<string, unknown>>;
  match: (row: Record<string, unknown>) => Record<string, unknown>;
}

const byId = (row: Record<string, unknown>) => ({ id: row.id });

const blockedCases: BlockedCase[] = [
  {
    table: "tasks",
    insert: () => insertFixture("tasks", { user_id: user.id, project_id: resourceProject.id, title: "Tarea a borrar" }),
    match: byId,
  },
  {
    table: "projects",
    insert: () => insertFixture("projects", { user_id: user.id, name: "Proyecto a borrar", color: "celeste" }),
    match: byId,
  },
  {
    table: "sections",
    insert: () => insertFixture("sections", { user_id: user.id, project_id: resourceProject.id, name: "Sección a borrar" }),
    match: byId,
  },
  {
    table: "habits",
    insert: () =>
      insertFixture("habits", {
        user_id: user.id,
        name: "Hábito a borrar",
        icon: "star",
        color: "celeste",
        duration_minutes: 10,
        frequency_type: "daily",
      }),
    match: byId,
  },
  {
    table: "labels",
    insert: () => insertFixture("labels", { user_id: user.id, name: "Etiqueta a borrar", color: "celeste" }),
    match: byId,
  },
  {
    table: "filters",
    insert: () => insertFixture("filters", { user_id: user.id, name: "Filtro a borrar", query: "inbox", color: "celeste" }),
    match: byId,
  },
  {
    table: "comments",
    insert: () => insertFixture("comments", { user_id: user.id, task_id: resourceTask.id, content: "Comentario a borrar" }),
    match: byId,
  },
  {
    table: "habit_completions",
    insert: () => insertFixture("habit_completions", { user_id: user.id, habit_id: resourceHabit.id, completed_on: "2026-01-01" }),
    match: byId,
  },
  {
    table: "habit_skips",
    insert: () => insertFixture("habit_skips", { user_id: user.id, habit_id: resourceHabit.id, date: "2026-01-02" }),
    match: (row) => ({ habit_id: row.habit_id, date: row.date }),
  },
  {
    table: "habit_schedule_overrides",
    insert: () =>
      insertFixture("habit_schedule_overrides", {
        user_id: user.id,
        habit_id: resourceHabit.id,
        date: "2026-01-03",
        scheduled_time: "09:00:00",
      }),
    match: (row) => ({ habit_id: row.habit_id, date: row.date }),
  },
  {
    table: "reminders",
    insert: () =>
      insertFixture("reminders", { user_id: user.id, task_id: resourceTask.id, remind_at: "2026-01-01T09:00:00Z" }),
    match: byId,
  },
  {
    table: "habit_reminders",
    insert: () => insertFixture("habit_reminders", { user_id: user.id, habit_id: resourceHabit.id, offset_minutes: -30 }),
    match: byId,
  },
  {
    table: "habit_reminder_deliveries",
    insert: () =>
      insertFixture("habit_reminder_deliveries", {
        user_id: user.id,
        habit_id: resourceHabit.id,
        date: "2026-01-04",
        offset_minutes: -15,
      }),
    match: (row) => ({ habit_id: row.habit_id, date: row.date, offset_minutes: row.offset_minutes }),
  },
  {
    table: "push_subscriptions",
    insert: () =>
      insertFixture("push_subscriptions", {
        user_id: user.id,
        endpoint: `https://push.example/${randomUUID()}`,
        p256dh: "clave-p256dh-de-prueba",
        auth: "clave-auth-de-prueba",
      }),
    match: byId,
  },
  {
    table: "calendar_connections",
    insert: () => insertFixture("calendar_connections", { user_id: user.id, refresh_token: "ciphertext-de-prueba" }),
    match: (row) => ({ user_id: row.user_id }),
  },
  {
    table: "view_preferences",
    insert: () => insertFixture("view_preferences", { user_id: user.id, view_key: "bandeja" }),
    match: (row) => ({ user_id: row.user_id, view_key: row.view_key }),
  },
];

describe("RLS de DELETE: token OAuth bloqueado, sesión de la app sin cambios", () => {
  for (const { table, insert, match } of blockedCases) {
    it(`${table}: OAuth no borra, la sesión de la app borra la misma fila`, async () => {
      const row = await insert();
      const filter = match(row);

      const { data: oauthResult, error: oauthError } = await applyMatch(oauthClient.from(table).delete(), filter).select();
      expect(oauthError).toBeNull();
      expect(oauthResult).toEqual([]);

      const { data: stillThere } = await applyMatch(admin.from(table).select("*"), filter);
      expect(stillThere).toHaveLength(1);

      const { data: appResult, error: appError } = await applyMatch(appClient.from(table).delete(), filter).select();
      expect(appError).toBeNull();
      expect(appResult).toHaveLength(1);

      const { data: gone } = await applyMatch(admin.from(table).select("*"), filter);
      expect(gone).toEqual([]);
    });
  }

  // user_preferences y profiles no se insertan a mano: el trigger de alta
  // de cuenta (`account_provisioning_trigger`) ya crea una fila por
  // usuario. Se usan tal cual, en vez de un insert, y por eso van al final
  // del describe — son las únicas dos filas de las que depende el resto de
  // la cuenta, y acá ya no queda ningún otro caso que las necesite.
  it("user_preferences: OAuth no borra, la sesión de la app borra la misma fila", async () => {
    const filter = { user_id: user.id };

    const { data: oauthResult, error: oauthError } = await applyMatch(oauthClient.from("user_preferences").delete(), filter).select();
    expect(oauthError).toBeNull();
    expect(oauthResult).toEqual([]);

    const { data: stillThere } = await applyMatch(admin.from("user_preferences").select("*"), filter);
    expect(stillThere).toHaveLength(1);

    const { data: appResult, error: appError } = await applyMatch(appClient.from("user_preferences").delete(), filter).select();
    expect(appError).toBeNull();
    expect(appResult).toHaveLength(1);

    const { data: gone } = await applyMatch(admin.from("user_preferences").select("*"), filter);
    expect(gone).toEqual([]);
  });

  it("profiles: OAuth no borra, la sesión de la app borra la misma fila", async () => {
    const filter = { id: user.id };

    const { data: oauthResult, error: oauthError } = await applyMatch(oauthClient.from("profiles").delete(), filter).select();
    expect(oauthError).toBeNull();
    expect(oauthResult).toEqual([]);

    const { data: stillThere } = await applyMatch(admin.from("profiles").select("*"), filter);
    expect(stillThere).toHaveLength(1);

    const { data: appResult, error: appError } = await applyMatch(appClient.from("profiles").delete(), filter).select();
    expect(appError).toBeNull();
    expect(appResult).toHaveLength(1);

    const { data: gone } = await applyMatch(admin.from("profiles").select("*"), filter);
    expect(gone).toEqual([]);
  });
});

describe("RLS de DELETE: la excepción, task_labels no se bloquea", () => {
  it("quitar una etiqueta de una tarea (DELETE en task_labels) funciona con el token OAuth", async () => {
    const { error: linkError } = await appClient
      .from("task_labels")
      .insert({ user_id: user.id, task_id: resourceTask.id, label_id: labelForBridge.id });
    expect(linkError).toBeNull();

    const filter = { task_id: resourceTask.id, label_id: labelForBridge.id };
    const { data: oauthResult, error: oauthError } = await applyMatch(oauthClient.from("task_labels").delete(), filter).select();
    expect(oauthError).toBeNull();
    expect(oauthResult).toHaveLength(1);

    const { data: gone } = await applyMatch(admin.from("task_labels").select("*"), filter);
    expect(gone).toEqual([]);
  });
});

describe("RLS: el token OAuth solo pierde DELETE, leer y escribir siguen andando", () => {
  it("SELECT con el token OAuth sigue trayendo los datos propios", async () => {
    const { data, error } = await oauthClient.from("tasks").select("id, title").eq("id", resourceTask.id).maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(resourceTask.id);
  });

  it("INSERT y UPDATE con el token OAuth siguen funcionando", async () => {
    const { data: inserted, error: insertError } = await oauthClient
      .from("tasks")
      .insert({ user_id: user.id, project_id: resourceProject.id, title: "Tarea creada por OAuth" })
      .select("id, title")
      .single();
    expect(insertError).toBeNull();
    expect(inserted?.title).toBe("Tarea creada por OAuth");

    const { data: updated, error: updateError } = await oauthClient
      .from("tasks")
      .update({ title: "Tarea editada por OAuth" })
      .eq("id", inserted!.id)
      .select("title")
      .single();
    expect(updateError).toBeNull();
    expect(updated?.title).toBe("Tarea editada por OAuth");
  });
});
