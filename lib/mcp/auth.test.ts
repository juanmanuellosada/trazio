import { beforeEach, describe, expect, it } from "vitest";
import { createVerifyMcpToken } from "./auth";

const ISSUER = "https://proyecto.supabase.co/auth/v1";

function fakeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.firma-no-verificada`;
}

describe("createVerifyMcpToken", () => {
  // Stub de `checkOAuthConsent` (D-K): los checks locales de arriba no
  // deberían llegar a llamarlo, así que si algún caso lo invoca sin querer,
  // el resultado ("activo") no puede disfrazar un bug — se verifica aparte
  // con `consentChecks` cuántas veces se llamó.
  let consentChecks: string[];
  function activeConsent(token: string): Promise<boolean> {
    consentChecks.push(token);
    return Promise.resolve(true);
  }
  const verify = createVerifyMcpToken(ISSUER, activeConsent);

  beforeEach(() => {
    consentChecks = [];
  });

  it("sin bearer token, no autentica", async () => {
    expect(await verify(new Request("http://x"), undefined)).toBeUndefined();
    expect(consentChecks).toEqual([]);
  });

  it("un token que no tiene tres partes, no autentica", async () => {
    expect(await verify(new Request("http://x"), "no-es-un-jwt")).toBeUndefined();
    expect(consentChecks).toEqual([]);
  });

  it("un token con el payload que no es JSON válido, no autentica", async () => {
    const token = "header.no-es-base64url-json.firma";
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
    expect(consentChecks).toEqual([]);
  });

  it("un emisor distinto al de Supabase, no autentica", async () => {
    const token = fakeJwt({ iss: "https://otro.example.com", client_id: "abc", exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
    expect(consentChecks).toEqual([]);
  });

  it("sin claim client_id (sesión normal de la app, no OAuth), no autentica — D-J", async () => {
    const token = fakeJwt({ iss: ISSUER, exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
    expect(consentChecks).toEqual([]);
  });

  it("un token vencido, no autentica", async () => {
    const token = fakeJwt({ iss: ISSUER, client_id: "abc", exp: Math.floor(Date.now() / 1000) - 10 });
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
    expect(consentChecks).toEqual([]);
  });

  it("emisor correcto, client_id presente y sin vencer: autentica", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({ iss: ISSUER, client_id: "cliente-123", sub: "user-1", exp });
    const authInfo = await verify(new Request("http://x"), token);
    expect(authInfo).toEqual({ token, clientId: "cliente-123", scopes: [], expiresAt: exp });
    expect(consentChecks).toEqual([token]);
  });

  it("el consentimiento fue revocado (D-K): no autentica aunque el JWT en sí sea válido", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({ iss: ISSUER, client_id: "cliente-123", sub: "user-1", exp });
    const verifyRevoked = createVerifyMcpToken(ISSUER, () => Promise.resolve(false));
    expect(await verifyRevoked(new Request("http://x"), token)).toBeUndefined();
  });

  it("la consulta de consentimiento falla (red, base caída): no autentica — cierra en falso, no en abierto", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({ iss: ISSUER, client_id: "cliente-123", sub: "user-1", exp });
    const verifyBroken = createVerifyMcpToken(ISSUER, () => Promise.reject(new Error("network")));
    await expect(verifyBroken(new Request("http://x"), token)).rejects.toThrow("network");
  });
});
