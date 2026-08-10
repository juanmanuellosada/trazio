/**
 * `oauth_consent_is_active()` (D-K de `design.md`, migración
 * `20260810020000_oauth_consent_is_active.sql`): revocar un asistente
 * conectado desde Configuración → Aplicaciones conectadas marca
 * `revoked_at` en `auth.oauth_consents`, pero el access token ya emitido es
 * un JWT sin estado que sigue siendo válido hasta que vence — hasta una
 * hora. Se probó la vía barata primero: ni `/auth/v1/oauth/userinfo` ni
 * PostgREST rechazan un token con el consentimiento recién revocado (los
 * dos siguen devolviendo 200 contra el stack local con el mismo token). Por
 * eso hace falta esta función, consultada por `lib/mcp/auth.ts` en cada
 * pedido del servidor MCP.
 *
 * Qué cubre este archivo:
 *   1. Grants — mismo motivo que `security-function-grants.test.ts`: sin
 *      este test, revocar solo de un par de roles vuelve a parecer
 *      suficiente. `anon` no puede ejecutarla (nunca trae un token OAuth).
 *   2. Comportamiento — con el consentimiento activo, `true`; revocado con
 *      el mismo mecanismo que usa la interfaz real (`auth.oauth.revokeGrant`,
 *      `lib/oauth/use-connected-apps.ts`), el mismo token pasa a `false` en
 *      la siguiente consulta, sin esperar a que expire.
 *   3. Aislamiento — sin `client_id` en el JWT (sesión normal de la app,
 *      sin pasar por OAuth) la función también da `false`: no hay
 *      consentimiento OAuth que preguntar.
 *
 * Cómo correr: `pnpm test:rls`, con Docker corriendo y
 * `pnpm supabase start` (o `db reset`) ya aplicado.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLocalSupabaseEnv } from "./env";
import { getOAuthAccessToken, getPasswordAccessToken } from "./oauth";

const env = getLocalSupabaseEnv();

const admin = createClient(env.apiUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function anonClient(): SupabaseClient {
  return createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function tokenClient(accessToken: string): SupabaseClient {
  return createClient(env.apiUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

interface TestUser {
  id: string;
  email: string;
  password: string;
}

async function createTestUser(): Promise<TestUser> {
  const email = `oauth-consent-${randomUUID()}@example.com`;
  const password = "contrasena-de-prueba-123";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

describe("oauth_consent_is_active: grants", () => {
  it("anon no puede ejecutarla", async () => {
    const { data, error } = await anonClient().rpc("oauth_consent_is_active");
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe("oauth_consent_is_active: comportamiento", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser();
  }, 30_000);

  afterAll(async () => {
    if (user) await admin.auth.admin.deleteUser(user.id);
  });

  it("sesión normal de la app (sin client_id en el JWT): false, no hay consentimiento OAuth que preguntar", async () => {
    const sessionToken = await getPasswordAccessToken(env, user.email, user.password);
    const { data, error } = await tokenClient(sessionToken).rpc("oauth_consent_is_active");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("consentimiento activo: true; revocado con auth.oauth.revokeGrant (mismo camino que la interfaz real), el mismo token pasa a false", async () => {
    const oauthAccessToken = await getOAuthAccessToken(env, user.email, user.password);

    const { data: beforeRevoke, error: beforeError } = await tokenClient(oauthAccessToken).rpc("oauth_consent_is_active");
    expect(beforeError).toBeNull();
    expect(beforeRevoke).toBe(true);

    // client_id viaja en el propio access token OAuth (mismo claim que
    // valida `lib/mcp/auth.ts`) — decodificarlo acá evita depender de un
    // segundo registro de cliente solo para tener el id a mano.
    const payload = JSON.parse(Buffer.from(oauthAccessToken.split(".")[1], "base64url").toString("utf8")) as {
      client_id: string;
    };

    // Mismo mecanismo que usa Configuración → Aplicaciones conectadas
    // (`lib/oauth/use-connected-apps.ts`, `useRevokeConnectedApp`): una
    // sesión normal de la app llamando a `auth.oauth.revokeGrant`, no un
    // `UPDATE` a mano contra `auth.oauth_consents`.
    const appClient = createClient(env.apiUrl, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInError } = await appClient.auth.signInWithPassword({ email: user.email, password: user.password });
    expect(signInError).toBeNull();
    const { error: revokeError } = await appClient.auth.oauth.revokeGrant({ clientId: payload.client_id });
    expect(revokeError).toBeNull();

    const { data: afterRevoke, error: afterError } = await tokenClient(oauthAccessToken).rpc("oauth_consent_is_active");
    expect(afterError).toBeNull();
    expect(afterRevoke).toBe(false);
  }, 30_000);
});
