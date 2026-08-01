import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAccessTokenExpiredError,
  GoogleReauthRequiredError,
  GoogleTransientError,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  listCalendars,
  refreshAccessToken,
} from "./google-client";

// Tarea 2.8: tests del cliente con la API de Google simulada. No hay
// credenciales reales todavía (grupo 0 pendiente), así que todo acá pasa
// por un `fetch` mockeado — no se probó ni una sola vez contra Google real.
// Ver el informe final del agente para el detalle de qué falta verificar
// cuando existan las credenciales.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("buildAuthorizationUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client-id-de-prueba";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("incluye access_type=offline y prompt=consent: sin los dos, Google no devuelve refresh token", () => {
    const url = new URL(buildAuthorizationUrl("un-state-cualquiera"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("un-state-cualquiera");
    expect(url.searchParams.get("client_id")).toBe("client-id-de-prueba");
  });
});

describe("exchangeAuthorizationCode / refreshAccessToken", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client-id-de-prueba";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret-de-prueba";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("intercambia el código y devuelve refresh token cuando Google lo incluye", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { access_token: "at-1", refresh_token: "rt-1", expires_in: 3600 }),
    );

    const tokens = await exchangeAuthorizationCode("codigo-valido");

    expect(tokens).toEqual({ accessToken: "at-1", refreshToken: "rt-1", expiresInSeconds: 3600 });
  });

  it("una respuesta sin refresh_token devuelve refreshToken null en vez de inventarlo", async () => {
    // Es lo que pasa si alguien se olvida de pedir prompt=consent, o si
    // Google decide no reemitirlo: el cliente no debe fallar en silencio ni
    // asumir un valor, solo reportar que no vino.
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { access_token: "at-1", expires_in: 3600 }));

    const tokens = await exchangeAuthorizationCode("codigo-valido");

    expect(tokens.refreshToken).toBeNull();
  });

  it("refresca el access token con un refresh token válido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { access_token: "at-nuevo", expires_in: 3599 }));

    const result = await refreshAccessToken("rt-valido");

    expect(result).toEqual({ accessToken: "at-nuevo", expiresInSeconds: 3599 });
  });

  it("un refresh token inválido o revocado lanza GoogleReauthRequiredError, no un error genérico", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." }),
    );

    await expect(refreshAccessToken("rt-revocado")).rejects.toBeInstanceOf(GoogleReauthRequiredError);
  });

  it("un 429 se reintenta una vez y, si el reintento funciona, no falla", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate_limit_exceeded" }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "at-tras-reintento", expires_in: 3600 }));

    const promise = refreshAccessToken("rt-valido");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.accessToken).toBe("at-tras-reintento");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("un segundo 429 seguido se trata como falla transitoria, no se reintenta en bucle", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate_limit_exceeded" }))
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate_limit_exceeded" }));

    const promise = refreshAccessToken("rt-valido");
    // La aserción se engancha a la promesa antes de avanzar los timers
    // falsos: si se espera runAllTimersAsync primero, el rechazo ocurre sin
    // que nada lo esté escuchando todavía y Vitest lo reporta como
    // rechazo no manejado.
    const assertion = expect(promise).rejects.toBeInstanceOf(GoogleTransientError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("un 500 de Google es una falla transitoria, no needs_reauth", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: "internal_error" }));

    const error = await refreshAccessToken("rt-valido").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GoogleTransientError);
    expect((error as GoogleTransientError).status).toBe(500);
  });
});

describe("listCalendars", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve los calendarios con su color, si es el primario y el rol de acceso", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          { id: "primary", summary: "Juan", backgroundColor: "#123456", primary: true, accessRole: "owner" },
          { id: "otro@group.calendar.google.com", summary: "Trabajo" },
        ],
      }),
    );

    const calendars = await listCalendars("access-token-valido");

    expect(calendars).toEqual([
      { id: "primary", summary: "Juan", backgroundColor: "#123456", primary: true, accessRole: "owner" },
      { id: "otro@group.calendar.google.com", summary: "Trabajo", backgroundColor: null, primary: false, accessRole: "reader" },
    ]);
  });

  it("un access token vencido lanza GoogleAccessTokenExpiredError, distinguible de un refresh fallido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { error: { message: "Invalid Credentials" } }));

    await expect(listCalendars("access-token-vencido")).rejects.toBeInstanceOf(GoogleAccessTokenExpiredError);
  });

  it("un 500 al listar calendarios es transitorio", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: { message: "Backend Error" } }));

    await expect(listCalendars("access-token-valido")).rejects.toBeInstanceOf(GoogleTransientError);
  });
});
