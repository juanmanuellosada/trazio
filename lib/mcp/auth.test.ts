import { describe, expect, it } from "vitest";
import { createVerifyMcpToken } from "./auth";

const ISSUER = "https://proyecto.supabase.co/auth/v1";

function fakeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.firma-no-verificada`;
}

describe("createVerifyMcpToken", () => {
  const verify = createVerifyMcpToken(ISSUER);

  it("sin bearer token, no autentica", async () => {
    expect(await verify(new Request("http://x"), undefined)).toBeUndefined();
  });

  it("un token que no tiene tres partes, no autentica", async () => {
    expect(await verify(new Request("http://x"), "no-es-un-jwt")).toBeUndefined();
  });

  it("un token con el payload que no es JSON válido, no autentica", async () => {
    const token = "header.no-es-base64url-json.firma";
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
  });

  it("un emisor distinto al de Supabase, no autentica", async () => {
    const token = fakeJwt({ iss: "https://otro.example.com", client_id: "abc", exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
  });

  it("sin claim client_id (sesión normal de la app, no OAuth), no autentica — D-J", async () => {
    const token = fakeJwt({ iss: ISSUER, exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
  });

  it("un token vencido, no autentica", async () => {
    const token = fakeJwt({ iss: ISSUER, client_id: "abc", exp: Math.floor(Date.now() / 1000) - 10 });
    expect(await verify(new Request("http://x"), token)).toBeUndefined();
  });

  it("emisor correcto, client_id presente y sin vencer: autentica", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({ iss: ISSUER, client_id: "cliente-123", sub: "user-1", exp });
    const authInfo = await verify(new Request("http://x"), token);
    expect(authInfo).toEqual({ token, clientId: "cliente-123", scopes: [], expiresAt: exp });
  });
});
