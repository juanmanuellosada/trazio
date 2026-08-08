import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { isProtectedPath, updateSession } from "./proxy";

// `updateSession` crea su cliente con `createServerClient`; lo mockeamos
// para controlar qué devuelve `getClaims()` sin pegarle a GoTrue de verdad.
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

/**
 * Tests de `isProtectedPath` (bloque 8.6): confirma que la lista de rutas
 * protegidas sigue siendo correcta ahora que `/proximos`, `/filtros`,
 * `/etiquetas` y `/buscar` existen de verdad. `/buscar` faltaba en la lista
 * original pese a que la ruta ya está implementada.
 */
describe("isProtectedPath", () => {
  it("protege /buscar", () => {
    expect(isProtectedPath("/buscar")).toBe(true);
  });

  it("protege /proximos", () => {
    expect(isProtectedPath("/proximos")).toBe(true);
  });

  it("protege /filtros y sus páginas de resultado", () => {
    expect(isProtectedPath("/filtros")).toBe(true);
    expect(isProtectedPath("/filtros/123")).toBe(true);
  });

  it("protege /etiquetas y la página propia de una etiqueta", () => {
    expect(isProtectedPath("/etiquetas")).toBe(true);
    expect(isProtectedPath("/etiquetas/456")).toBe(true);
  });

  it("no protege rutas públicas", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });
});

/** Cookie con forma de las que deja `@supabase/ssr`: basta con que exista para simular una sesión presente en el navegador. */
const AUTH_COOKIE = "sb-project-auth-token=eyJhbGciOiJIUzI1NiJ9.fake-session.signature";

function mockGetClaims(result: { data: { claims: Record<string, unknown> } | null; error: unknown }) {
  (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: { getClaims: vi.fn().mockResolvedValue(result) },
  });
}

function buildRequest(pathname: string, cookieHeader?: string) {
  const url = new URL(pathname, "http://localhost:3000");
  return new NextRequest(url, cookieHeader ? { headers: { cookie: cookieHeader } } : undefined);
}

/**
 * Defecto diagnosticado: `updateSession` decide si hay sesión mirando solo
 * si `getClaims()` devolvió `claims`, sin mirar `error`. Un fallo transitorio
 * de `getClaims()` (red, JWKS, 5xx, rate limit) devuelve `{ data: null, error }`
 * igual que "no hay sesión", así que el proxy expulsa a `/login` a alguien
 * con cookies de sesión válidas. Ver `lib/supabase/proxy.ts` líneas 74-90.
 */
describe("updateSession", () => {
  it("[ROJO — reproduce el defecto] con cookies de sesión presentes, si getClaims() falla de forma transitoria no debería redirigir a /login", async () => {
    mockGetClaims({ data: null, error: { message: "fetch failed", status: 0 } });
    const request = buildRequest("/hoy", AUTH_COOKIE);

    const response = await updateSession(request);

    // Hoy esto falla: el proxy redirige a /login pese a que había cookies
    // de sesión, porque solo mira `data`, no `error`.
    expect(response.headers.get("location")).toBeNull();
  });

  it("(control) sin ninguna cookie de auth, si getClaims() dice que no hay sesión sí redirige a /login", async () => {
    mockGetClaims({ data: null, error: null });
    const request = buildRequest("/hoy");

    const response = await updateSession(request);

    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location!).pathname).toBe("/login");
  });

  it("con claims válidos no redirige a /login", async () => {
    mockGetClaims({ data: { claims: { sub: "user-1" } }, error: null });
    const request = buildRequest("/hoy", AUTH_COOKIE);

    const response = await updateSession(request);

    expect(response.headers.get("location")).toBeNull();
  });
});
