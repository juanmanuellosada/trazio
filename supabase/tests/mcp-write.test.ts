/**
 * Ola 7 de `servidor-mcp` (spec `mcp`): las cinco herramientas de escritura,
 * verificadas de punta a punta contra el stack local con un token OAuth
 * real (`getOAuthAccessToken`, mismo helper que
 * `oauth-delete-restrictions.test.ts` de la Ola 4). Los handlers ya tienen
 * cobertura unitaria en `lib/mcp/tools/*.test.ts` con un cliente de
 * Supabase fake; este archivo cubre lo que un fake no puede: los tres
 * invariantes que el esquema no protege, contra Postgres real.
 *
 * 1. **Recurrencia (el más grave):** completar una tarea recurrente por
 *    `completar_tarea` tiene que crear la siguiente ocurrencia en la base —
 *    si esto falla, la función destruye datos en silencio.
 * 2. **Descripción de Tiptap:** un objeto con forma inválida se rechaza y
 *    nunca pisa la descripción anterior.
 * 3. **Filtro inválido:** se rechaza antes de guardar, no al abrirlo después.
 *
 * Más la garantía de la Ola 4 (DELETE bloqueado con el token OAuth) sobre
 * una fila creada por estas herramientas nuevas.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { archivar } from "@/lib/mcp/tools/archivar";
import { completarTarea } from "@/lib/mcp/tools/completar-tarea";
import { crear } from "@/lib/mcp/tools/crear";
import { crearTarea } from "@/lib/mcp/tools/crear-tarea";
import { editar } from "@/lib/mcp/tools/editar";
import { getLocalSupabaseEnv } from "./env";
import { unwrap } from "./helpers";
import { getOAuthAccessToken } from "./oauth";

const env = getLocalSupabaseEnv();

const admin = createClient<Database>(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Desestructura `{ data, error }` de una promesa de PostgREST y aplica
 * `unwrap` en un solo paso. `T` explícito en cada llamada, no inferido: la
 * respuesta real de `.single()`/`.select()` es una unión discriminada
 * (`{data: Row; error: null} | {data: null; error: PostgrestError}`), y
 * dejar que TS la unifique estructuralmente contra un genérico termina
 * infiriendo `T` como `Row | null` — el mismo motivo por el que
 * `insertFixture` de `oauth-delete-restrictions.test.ts` castea a mano en
 * vez de tipar de punta a punta.
 */
async function readRow<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>, context: string): Promise<T> {
  const { data, error } = await promise;
  return unwrap(data as T | null, error, context);
}

interface TestUser {
  id: string;
  email: string;
  password: string;
}

let user: TestUser;
/** Mismo usuario, autenticado con el access token del servidor OAuth: trae `client_id` — el cliente que arma cada herramienta del MCP (`lib/mcp/client.ts`). */
let oauthClient: SupabaseClient<Database>;

beforeAll(async () => {
  const email = `mcp-write-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  user = { id: data.user.id, email, password };

  const oauthAccessToken = await getOAuthAccessToken(env, email, password);
  oauthClient = createClient<Database>(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${oauthAccessToken}` } },
  });
}, 30_000);

afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("completar_tarea: el invariante de recurrencia contra la base real", () => {
  it("completar una tarea con recurrence_rule crea la siguiente ocurrencia (mismo criterio D53: corta en el vencimiento, no en hoy)", async () => {
    const project = await readRow<{ id: string }>(
      admin.from("projects").insert({ user_id: user.id, name: "Proyecto recurrente", color: "celeste", position: 1000 }).select("id").single(),
      "Crear proyecto de prueba",
    );

    // Vence hoy, regla diaria: D53 dice que la siguiente ocurrencia tiene que
    // ser el vencimiento (mañana), no "hoy" de nuevo.
    const today = new Date().toISOString().slice(0, 10);
    const original = await readRow<{ id: string; due_date: string | null }>(
      admin
        .from("tasks")
        .insert({
          user_id: user.id,
          project_id: project.id,
          title: "Regar las plantas",
          due_date: today,
          recurrence_rule: "FREQ=DAILY",
          position: 1000,
        })
        .select("id, due_date")
        .single(),
      "Crear tarea recurrente de prueba",
    );

    const result = await completarTarea(oauthClient, { id: original.id, completado: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.next_occurrence_id).not.toBeNull();

    const completedRow = await readRow<{ completed_at: string | null }>(
      admin.from("tasks").select("completed_at").eq("id", original.id).single(),
      "Leer la tarea original",
    );
    expect(completedRow.completed_at).not.toBeNull();

    const nextRow = await readRow<{ title: string; due_date: string | null; recurrence_rule: string | null; completed_at: string | null }>(
      admin.from("tasks").select("id, title, due_date, recurrence_rule, completed_at").eq("id", result.next_occurrence_id!).single(),
      "Leer la siguiente ocurrencia",
    );
    expect(nextRow.title).toBe("Regar las plantas");
    expect(nextRow.recurrence_rule).toBe("FREQ=DAILY");
    expect(nextRow.completed_at).toBeNull();
    expect(nextRow.due_date).not.toBe(original.due_date); // D53: avanzó, no se duplicó en la misma fecha
  });
});

describe("crear_tarea: lenguaje natural produce los mismos atributos que el alta rápida de la app", () => {
  it("fecha relativa, hora y prioridad reconocidas del texto quedan en las columnas correspondientes", async () => {
    const result = await crearTarea(oauthClient, { texto: "Llamar al contador mañana a las 10 p2" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    expect(result.task.title).toBe("Llamar al contador");
    expect(result.task.priority).toBe(2);
    expect(result.task.due_at).not.toBeNull();
    expect(result.task.due_date).toBeNull();

    const row = await readRow<{ title: string; priority: number; due_at: string | null; due_date: string | null; position: number }>(
      admin.from("tasks").select("title, priority, due_at, due_date, position").eq("id", result.task.id).single(),
      "Leer la tarea creada por crear_tarea",
    );
    expect(row.title).toBe("Llamar al contador");
    expect(row.priority).toBe(2);
    expect(row.due_at).not.toBeNull();
    expect(Number(row.position)).toBeGreaterThan(0); // la asignó el trigger, nunca se mandó
  });
});

describe("editar: una description con forma inválida se rechaza sin pisar la anterior", () => {
  it("rechaza el objeto inválido y la descripción original sigue intacta", async () => {
    const created = await crearTarea(oauthClient, { texto: "Tarea con descripción", description: "Notas originales" });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);

    const result = await editar(oauthClient, { tipo: "tarea", id: created.task.id, description: { text: "forma inválida" } });
    expect(result.ok).toBe(false);

    const row = await readRow<{ description: string | null }>(
      admin.from("tasks").select("description").eq("id", created.task.id).single(),
      "Leer la tarea tras el intento de edición rechazado",
    );
    expect(row.description).toBe("Notas originales"); // nunca se pisó
  });
});

describe("crear: un filtro con query inválida se rechaza antes de guardar", () => {
  it("no se crea ninguna fila en filters", async () => {
    const before = await readRow<{ id: string }[]>(admin.from("filters").select("id").eq("user_id", user.id), "Contar filtros antes");

    const result = await crear(oauthClient, { tipo: "filtro", name: "Filtro roto", color: "celeste", query: "priority:" });
    expect(result.ok).toBe(false);

    const after = await readRow<{ id: string }[]>(admin.from("filters").select("id").eq("user_id", user.id), "Contar filtros después");
    expect(after.length).toBe(before.length);
  });
});

describe("archivar: no es borrar", () => {
  it("archiva un proyecto sin perder sus tareas", async () => {
    // Un proyecto propio, no la Bandeja de entrada: esa está protegida y
    // `crear_tarea` sin project_id cae ahí (verificado sin querer más abajo
    // por el `archivar` que sí la protege — la Bandeja nunca se archiva).
    const proyectoCreado = await crear(oauthClient, { tipo: "proyecto", name: "Proyecto a archivar", color: "celeste" });
    expect(proyectoCreado.ok).toBe(true);
    if (!proyectoCreado.ok) throw new Error(proyectoCreado.error);

    const created = await crearTarea(oauthClient, { texto: "Tarea de un proyecto a archivar", project_id: proyectoCreado.id });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);

    const result = await archivar(oauthClient, { tipo: "proyecto", id: proyectoCreado.id });
    expect(result.ok).toBe(true);

    const project = await readRow<{ is_archived: boolean }>(
      admin.from("projects").select("is_archived").eq("id", proyectoCreado.id).single(),
      "Leer el proyecto archivado",
    );
    expect(project.is_archived).toBe(true);

    const { data: task } = await admin.from("tasks").select("id").eq("id", created.task.id).maybeSingle();
    expect(task).not.toBeNull(); // archivar no borró la tarea
  });

  it("la Bandeja de entrada no se puede archivar, ni siquiera vía la herramienta MCP", async () => {
    const created = await crearTarea(oauthClient, { texto: "Tarea sin proyecto explícito, cae en la Bandeja" });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);

    const inbox = await readRow<{ id: string; is_inbox: boolean }>(
      admin.from("projects").select("id, is_inbox").eq("id", created.task.project_id).single(),
      "Leer el proyecto de la tarea recién creada",
    );
    expect(inbox.is_inbox).toBe(true); // confirma que crear_tarea sin project_id cayó en la Bandeja, como en la app

    // El esquema la protege con un trigger que lanza excepción
    // (`.claude/rules/database.md`: "Protegerlo también a nivel base de
    // datos") — `archivar` no la esquiva ni la traga en silencio, la deja
    // propagarse.
    await expect(archivar(oauthClient, { tipo: "proyecto", id: inbox.id })).rejects.toThrow(/bandeja/i);
  });
});

describe("la garantía de la Ola 4 sigue en pie: el token OAuth tampoco puede borrar lo que crean estas herramientas nuevas", () => {
  it("un DELETE directo contra tasks con el token OAuth no borra nada", async () => {
    const created = await crearTarea(oauthClient, { texto: "Tarea que el token OAuth no puede borrar" });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);

    const { data: deleteResult, error: deleteError } = await oauthClient.from("tasks").delete().eq("id", created.task.id).select();
    expect(deleteError).toBeNull();
    expect(deleteResult).toEqual([]);

    const { data: stillThere } = await admin.from("tasks").select("id").eq("id", created.task.id).maybeSingle();
    expect(stillThere).not.toBeNull();
  });
});
