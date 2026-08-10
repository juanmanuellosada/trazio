/**
 * Helper de la Ola 4 de `servidor-mcp` (D-C de design.md): consigue un
 * access token real emitido por el servidor OAuth 2.1 de Supabase —no un
 * token de sesión de contraseña— para que los tests de RLS puedan probar
 * la política que distingue "vino por OAuth" de "sesión normal de la app"
 * mirando el claim `client_id`.
 *
 * Reproduce el mismo flujo que se verificó a mano contra el stack local
 * antes de escribir la migración: registro dinámico de un cliente
 * descartable (`client_type: public`, sin secreto — D-A de design.md),
 * `/oauth/authorize` con PKCE autenticado con el token de sesión del
 * usuario, aprobación explícita del consentimiento (un cliente recién
 * registrado nunca tiene consentimiento previo) y canje del código por un
 * access token. El endpoint de canje es `/auth/v1/oauth/token`, no
 * `/auth/v1/token` — ese devuelve `unsupported_grant_type` para
 * `authorization_code`, la trampa que hizo perder tiempo al verificar esto
 * a mano.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { LocalSupabaseEnv } from "./env";

const REDIRECT_URI = "http://127.0.0.1:9999/callback";

function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function requestJson<T>(url: string, init: RequestInit, context: string): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${context}: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

/** Sesión normal por contraseña — el mismo camino que usa la app, sin `client_id` en el token. */
export async function getPasswordAccessToken(env: LocalSupabaseEnv, email: string, password: string): Promise<string> {
  const { access_token } = await requestJson<{ access_token: string }>(
    `${env.apiUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: env.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    `No se pudo iniciar sesión con "${email}"`,
  );
  return access_token;
}

/**
 * Access token emitido por el servidor OAuth para el usuario `email`, con
 * el claim `client_id` puesto. Requiere que `[auth.oauth_server]` esté
 * habilitado (ya lo está en `supabase/config.toml` para el stack local).
 */
export async function getOAuthAccessToken(env: LocalSupabaseEnv, email: string, password: string): Promise<string> {
  const sessionToken = await getPasswordAccessToken(env, email, password);

  const { client_id: clientId } = await requestJson<{ client_id: string }>(
    `${env.apiUrl}/auth/v1/oauth/clients/register`,
    {
      method: "POST",
      headers: { apikey: env.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: `rls-test-${randomUUID()}`,
        redirect_uris: [REDIRECT_URI],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    },
    "No se pudo registrar el cliente OAuth de prueba",
  );

  const { verifier, challenge } = createPkcePair();
  const authorizeUrl = new URL(`${env.apiUrl}/auth/v1/oauth/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", randomUUID());
  authorizeUrl.searchParams.set("scope", "openid email");

  const authorizeResponse = await fetch(authorizeUrl, {
    method: "GET",
    redirect: "manual",
    headers: { apikey: env.anonKey, Authorization: `Bearer ${sessionToken}` },
  });
  const location = authorizeResponse.headers.get("location");
  if (!location) {
    throw new Error(`/oauth/authorize no devolvió un redirect con authorization_id (status ${authorizeResponse.status})`);
  }
  const authorizationId = new URL(location).searchParams.get("authorization_id");
  if (!authorizationId) {
    throw new Error(`No se pudo leer authorization_id de la redirección: ${location}`);
  }

  // Verificado a mano: sin este GET antes del POST de abajo, el consent
  // devuelve 404 "authorization_not_found" — aunque el `authorization_id`
  // sea el mismo que acaba de devolver `/oauth/authorize`. La pantalla de
  // consentimiento real (`/oauth/consent`) siempre hace este GET primero
  // (`getAuthorizationDetails`, D-B de design.md) para mostrar qué
  // aplicación pide acceso, así que en un flujo real este paso nunca falta
  // — pero un test que fuera directo al POST se rompía por esto.
  await requestJson(
    `${env.apiUrl}/auth/v1/oauth/authorizations/${authorizationId}`,
    { headers: { apikey: env.anonKey, Authorization: `Bearer ${sessionToken}` } },
    "No se pudo leer el detalle de la autorización OAuth de prueba",
  );

  const { redirect_url: redirectUrl } = await requestJson<{ redirect_url: string }>(
    `${env.apiUrl}/auth/v1/oauth/authorizations/${authorizationId}/consent`,
    {
      method: "POST",
      headers: { apikey: env.anonKey, Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    },
    "No se pudo aprobar la autorización OAuth de prueba",
  );
  const code = new URL(redirectUrl).searchParams.get("code");
  if (!code) {
    throw new Error(`No se pudo leer "code" de la redirección de consentimiento: ${redirectUrl}`);
  }

  const { access_token: oauthAccessToken } = await requestJson<{ access_token: string }>(
    `${env.apiUrl}/auth/v1/oauth/token`,
    {
      method: "POST",
      headers: { apikey: env.anonKey, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
      }),
    },
    "No se pudo canjear el code OAuth por un access token",
  );
  return oauthAccessToken;
}
