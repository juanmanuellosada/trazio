import { getSiteUrl } from "@/lib/site-url";

/**
 * URLs del servidor MCP (Ola 6, D-I de `design.md`), derivadas de
 * `getSiteUrl` (mismo criterio que el resto de la app, `lib/site-url.ts`):
 * el host del pedido gana por sobre el fijo de `NEXT_PUBLIC_SITE_URL`
 * cuando se lo pasa, para que anuncien el dominio (`www` o no) por el que
 * el cliente MCP realmente se conectó.
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
export function getMcpResourceUrl(requestHost?: string | null): string {
  return `${getSiteUrl(requestHost)}/api/mcp`;
}

export function getMcpResourceOrigin(requestHost?: string | null): string {
  return getSiteUrl(requestHost);
}

/** Emisor del servidor OAuth 2.1 de Supabase (D-A de `design.md`). */
export function getSupabaseIssuerUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
}
