/**
 * URLs del servidor MCP (Ola 6, D-I de `design.md`), derivadas de las
 * variables de entorno ya existentes. Funciones, no constantes de módulo:
 * evaluarlas recién al manejar un pedido evita que falte una variable de
 * entorno rompa el build de Next.js (que sí puede evaluar un route handler
 * al recolectar datos de la página) — mismo criterio que
 * `lib/supabase/server.ts`.
 *
 * `getMcpResourceUrl()` es el identificador RFC 9728 del recurso protegido
 * (con el path `/api/mcp` incluido): tiene que coincidir al carácter con el
 * `resource` que anuncia `app/.well-known/oauth-protected-resource/route.ts`
 * y con la URL que un cliente MCP escribe para conectarse.
 *
 * `getMcpResourceOrigin()` es distinto y no intercambiable, verificado
 * contra el código de `mcp-handler` (no solo contra su doc): el `resourceUrl`
 * que recibe `withMcpAuth` no es el identificador del recurso — es el origen
 * que la librería concatena con `resourceMetadataPath` para armar la URL de
 * `WWW-Authenticate: resource_metadata` (`origin + resourceMetadataPath`,
 * `mcp-handler/dist/index.mjs`). Pasarle `getMcpResourceUrl()` (con
 * `/api/mcp`) ahí produce
 * `.../api/mcp/.well-known/oauth-protected-resource`, una URL que no
 * existe — se verificó a mano contra el stack local antes de separar las
 * dos funciones.
 */
export function getMcpResourceUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/api/mcp`;
}

export function getMcpResourceOrigin(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}`;
}

/** Emisor del servidor OAuth 2.1 de Supabase (D-A de `design.md`). */
export function getSupabaseIssuerUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
}
