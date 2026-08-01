import { randomBytes } from "node:crypto";

/**
 * Cliente de Google Calendar hablado por `fetch`, sin `googleapis` ni
 * `google-auth-library` (decisión D-B de
 * openspec/changes/fase-4-calendario/design.md). Este módulo solo sabe
 * hablar con los endpoints de Google: no importa Supabase ni conoce
 * `calendar_connections`. La orquestación con la conexión guardada vive en
 * `lib/calendar/connection.ts`.
 *
 * Importa `node:crypto` (para `generateOAuthState`), así que igual que
 * `lib/calendar/crypto.ts`, cualquier intento de usar este módulo desde un
 * componente cliente falla en el build en vez de exponer
 * `GOOGLE_CLIENT_SECRET` silenciosamente.
 */

/**
 * Costura para los e2e (tarea 8.11): sin `GOOGLE_API_BASE_URL` seteada, esta
 * función devuelve la URL real de Google tal cual — en producción no cambia
 * nada. Con la variable seteada (solo Playwright la setea), reemplaza el
 * origen por un servidor simulado, conservando el resto de la URL intacto.
 * Necesaria porque estas llamadas las hace el servidor de Next, no el
 * navegador: a diferencia de un `fetch` de cliente, Playwright no puede
 * interceptarlas con `page.route`.
 */
export function withGoogleApiBaseOverride(url: string): string {
  const override = process.env.GOOGLE_API_BASE_URL;
  if (!override) return url;
  const parsed = new URL(url);
  return `${override}${parsed.pathname}${parsed.search}`;
}

const TOKEN_ENDPOINT = withGoogleApiBaseOverride("https://oauth2.googleapis.com/token");
const AUTH_ENDPOINT = withGoogleApiBaseOverride("https://accounts.google.com/o/oauth2/v2/auth");
const CALENDAR_LIST_ENDPOINT = withGoogleApiBaseOverride("https://www.googleapis.com/calendar/v3/users/me/calendarList");

// Scope de acceso total: docs/setup-google-calendar.md explica por qué. El
// ABM de calendarios de esta fase (crear, renombrar, recolorear, eliminar)
// exige este scope; los acotados (`calendar.events`, `calendar.calendarlist.readonly`)
// no alcanzan.
const SCOPE = "https://www.googleapis.com/auth/calendar";

const RETRY_DELAY_MS = 300;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (ver docs/setup-google-calendar.md).`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reintenta una única vez ante 429: es el único código de estado donde
 * Google mismo pide esperar y volver a pedir. Un segundo 429 seguido se
 * trata como falla transitoria en vez de reintentar en bucle.
 */
async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 429) return response;
  await sleep(RETRY_DELAY_MS);
  return fetch(input, init);
}

/**
 * El refresh token es inválido, fue revocado, o el código de autorización
 * venció o ya se usó: Google lo señala con `invalid_grant`. Quien orquesta
 * (`lib/calendar/connection.ts`) marca la conexión como `needs_reauth`
 * cuando esto ocurre al refrescar.
 */
export class GoogleReauthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleReauthRequiredError";
  }
}

/**
 * Falla transitoria de Google: 429 agotado el reintento, o 5xx. No dice
 * nada sobre la validez de la conexión — no hay que tocar `status` cuando
 * esto pasa, solo reintentar más tarde.
 */
export class GoogleTransientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleTransientError";
    this.status = status;
  }
}

/**
 * El access token venció o Google lo rechaza en medio de una llamada a la
 * API de Calendar (a diferencia de `GoogleReauthRequiredError`, que es un
 * fallo del refresh token). Quien orquesta refresca y reintenta una vez.
 */
export class GoogleAccessTokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAccessTokenExpiredError";
  }
}

/**
 * Valor aleatorio criptográfico para el parámetro `state` (protección CSRF
 * del flujo de OAuth, tarea 2.3). `lib/calendar/oauth-state.ts` lo guarda en
 * una cookie de servidor y lo verifica en el callback antes de canjear el
 * código.
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * URL de autorización de Google. `access_type=offline` y `prompt=consent`
 * son obligatorios (tarea 2.1): sin los dos, Google no devuelve refresh
 * token en la primera autorización (docs/setup-google-calendar.md).
 */
export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleTokens = {
  accessToken: string;
  /** `null` cuando Google no devolvió uno: pasa si el usuario ya había dado consentimiento y algo hizo que no se forzara de nuevo. */
  refreshToken: string | null;
  expiresInSeconds: number;
};

type TokenErrorBody = { error?: string; error_description?: string };

async function parseTokenResponse(response: Response, context: string): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => ({}))) as TokenErrorBody & Record<string, unknown>;

  if (response.ok) return body;

  if (response.status === 429) {
    throw new GoogleTransientError(`Google sigue devolviendo 429 al ${context} después de reintentar`, 429);
  }
  if (response.status >= 500) {
    throw new GoogleTransientError(`Google devolvió ${response.status} al ${context}`, response.status);
  }
  if (body.error === "invalid_grant") {
    throw new GoogleReauthRequiredError(
      body.error_description ||
        `Google rechazó las credenciales al ${context}: son inválidas, vencieron o fueron revocadas`,
    );
  }
  throw new Error(`Google rechazó la solicitud al ${context}: ${body.error ?? response.status}`);
}

/** Intercambia el código de autorización por el primer access token y refresh token (tarea 2.2). */
export async function exchangeAuthorizationCode(code: string): Promise<GoogleTokens> {
  const response = await fetchWithRetry(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  const body = await parseTokenResponse(response, "canjear el código de autorización");
  return {
    accessToken: body.access_token as string,
    refreshToken: (body.refresh_token as string | undefined) ?? null,
    expiresInSeconds: (body.expires_in as number | undefined) ?? 3600,
  };
}

/**
 * Pide un access token nuevo con el refresh token guardado (tarea 2.5).
 * Google no devuelve un refresh token nuevo acá —solo en la primera
 * autorización—, así que el resultado no incluye uno.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const response = await fetchWithRetry(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });

  const body = await parseTokenResponse(response, "refrescar el access token");
  return {
    accessToken: body.access_token as string,
    expiresInSeconds: (body.expires_in as number | undefined) ?? 3600,
  };
}

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
  backgroundColor: string | null;
  primary: boolean;
  /**
   * Rol de la cuenta conectada sobre este calendario ("owner", "writer",
   * "reader", "freeBusyReader"). Se propaga para deshabilitar "Eliminar" en
   * calendarios que no son propios (importados, suscriptos, feriados,
   * cumpleaños): `calendars.delete` exige `owner` y Google lo rechaza con
   * 403 aunque el scope sea el correcto. Si Google no lo manda, se asume
   * "reader" (no dueño) en vez de asumir "owner": ante ambigüedad, menos
   * permiso, no más.
   */
  accessRole: string;
};

type CalendarListResponse = {
  items?: Array<{ id: string; summary: string; backgroundColor?: string; primary?: boolean; accessRole?: string }>;
};

/** Lista los calendarios de la cuenta conectada (tarea 2.7). */
export async function listCalendars(accessToken: string): Promise<GoogleCalendarSummary[]> {
  const response = await fetchWithRetry(CALENDAR_LIST_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    throw new GoogleAccessTokenExpiredError("El access token venció o fue rechazado por Google");
  }
  if (response.status === 429) {
    throw new GoogleTransientError(
      "Google sigue devolviendo 429 al listar los calendarios después de reintentar",
      429,
    );
  }
  if (response.status >= 500) {
    throw new GoogleTransientError(`Google devolvió ${response.status} al listar los calendarios`, response.status);
  }
  if (!response.ok) {
    throw new Error(`Google rechazó la solicitud al listar los calendarios: ${response.status}`);
  }

  const body = (await response.json()) as CalendarListResponse;
  return (body.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary,
    backgroundColor: item.backgroundColor ?? null,
    primary: item.primary ?? false,
    accessRole: item.accessRole ?? "reader",
  }));
}
