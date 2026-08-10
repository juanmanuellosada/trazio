import type { AuthInfo } from "@modelcontextprotocol/server";

/**
 * Verificación del access token del servidor MCP (Ola 6, D-A/D-J de
 * `design.md`). No verifica la firma del JWT acá — decodifica el payload
 * nomás, sin llamar a Supabase. La validación real (firma, vencimiento
 * efectivo) ocurre en el perímetro que sí importa: cada herramienta usa
 * este mismo token para hablar con PostgREST (`lib/mcp/client.ts`), que lo
 * valida contra la clave del proyecto y aplica RLS — un token forjado no
 * pasa de ahí. Esta función es una admisión previa barata (evita gastar un
 * viaje a la base con un token obviamente inválido o vencido), no el
 * perímetro de seguridad.
 *
 * **D-J — audiencia, sin cumplir la letra de RFC 8707.** La spec de MCP
 * exige validar que el token fue emitido para este servidor. El JWT de
 * Supabase trae `aud: "authenticated"` para cualquier recurso, no una URI
 * nuestra, y el proyecto no anuncia soporte de RFC 8707 — no hay forma
 * limpia de cumplir la letra de la spec (ver D-J en `design.md`, sección
 * "Validación de audiencia"). La decisión registrada, implementada acá, es
 * validar **emisor (`iss`) más la presencia del claim `client_id`**: ese
 * claim solo aparece en un token emitido por el servidor OAuth 2.1 de
 * Supabase en un flujo OAuth real (una sesión normal de la app, login por
 * contraseña, nunca lo trae — el mismo claim que distingue el acceso OAuth
 * en la Ola 4 de RLS, `supabase/migrations/20260810010000_oauth_client_delete_restrictions.sql`).
 * Cumple el espíritu de la validación (el token vino de nuestro servidor de
 * autorización, en un flujo OAuth) sin cumplir la letra exacta de RFC
 * 8707 — riesgo aceptado, no resuelto, documentado en D-J.
 */
type SupabaseAccessTokenClaims = {
  iss?: unknown;
  client_id?: unknown;
  sub?: unknown;
  exp?: unknown;
};

function decodeAccessToken(token: string): SupabaseAccessTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const claims: unknown = JSON.parse(json);
    return typeof claims === "object" && claims !== null ? (claims as SupabaseAccessTokenClaims) : null;
  } catch {
    return null;
  }
}

/**
 * Fábrica en vez de una función suelta: `supabaseIssuer` viene de una
 * variable de entorno (`app/api/mcp/route.ts`), y pasarlo como parámetro
 * (en vez de leer `process.env` acá adentro) es lo que permite testear la
 * validación sin depender del entorno del proceso.
 */
export function createVerifyMcpToken(supabaseIssuer: string) {
  return function verifyMcpToken(_req: Request, bearerToken?: string): AuthInfo | undefined {
    if (!bearerToken) return undefined;

    const claims = decodeAccessToken(bearerToken);
    if (!claims) return undefined;
    if (claims.iss !== supabaseIssuer) return undefined;
    if (typeof claims.client_id !== "string" || claims.client_id.length === 0) return undefined;
    if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) return undefined;

    return {
      token: bearerToken,
      clientId: claims.client_id,
      scopes: [],
      expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
    };
  };
}
