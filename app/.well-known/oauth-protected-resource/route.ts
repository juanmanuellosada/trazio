import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";
import { getMcpResourceUrl, getSupabaseIssuerUrl } from "@/lib/mcp/config";

/**
 * Metadata de recurso protegido, RFC 9728 (Ola 6 de `servidor-mcp`, sección
 * "La autorización" del prompt de la ola): `authorization_servers` es el
 * emisor del servidor OAuth 2.1 de Supabase, y `resource` tiene que
 * coincidir exacto — mismo string, incluido el path — con la URL que un
 * cliente MCP escribe para conectarse (`app/api/mcp/route.ts`, mismo
 * `getMcpResourceUrl()`).
 */
const handler = protectedResourceHandler({
  authServerUrls: [getSupabaseIssuerUrl()],
  resourceUrl: getMcpResourceUrl(),
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
