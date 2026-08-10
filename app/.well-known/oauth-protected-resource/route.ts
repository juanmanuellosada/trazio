import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";
import { getMcpResourceUrl, getSupabaseIssuerUrl } from "@/lib/mcp/config";
import { getRequestHost } from "@/lib/site-url";

/**
 * Metadata de recurso protegido, RFC 9728 (Ola 6 de `servidor-mcp`, sección
 * "La autorización" del prompt de la ola): `authorization_servers` es el
 * emisor del servidor OAuth 2.1 de Supabase, y `resource` tiene que
 * coincidir exacto — mismo string, incluido el path — con la URL que un
 * cliente MCP escribe para conectarse (`app/api/mcp/route.ts`, mismo
 * `getMcpResourceUrl()`).
 *
 * `protectedResourceHandler` fija `resourceUrl` por clausura en el momento
 * en que se lo llama — no admite recalcularlo por pedido. Por eso se arma
 * de nuevo en cada `GET` con el host de ese pedido puntual
 * (`getRequestHost`), para anunciar el mismo dominio (`www` o no) que
 * `app/api/mcp/route.ts` anuncia para ese pedido.
 */
export function GET(request: Request) {
  const handler = protectedResourceHandler({
    authServerUrls: [getSupabaseIssuerUrl()],
    resourceUrl: getMcpResourceUrl(getRequestHost(request.headers)),
  });
  return handler(request);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
