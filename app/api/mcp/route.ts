import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { createVerifyMcpToken } from "@/lib/mcp/auth";
import { getMcpResourceOrigin, getSupabaseIssuerUrl } from "@/lib/mcp/config";
import { initializeMcpServer } from "@/lib/mcp/server";
import { getRequestHost } from "@/lib/site-url";

/**
 * Servidor MCP de Trazio (Ola 6 de `servidor-mcp`, D-I de `design.md`): un
 * route handler más de Next.js, sin despliegue aparte. `mcp-handler` v2
 * (repo `vercel/mcp-handler`, no `@vercel/mcp-adapter`) es sin sesiones y
 * no necesita Redis — el transporte es streamable HTTP stateless.
 *
 * `withMcpAuth` valida el `Authorization: Bearer` de cada pedido
 * (`lib/mcp/auth.ts`, D-J: emisor + presencia de `client_id`, no RFC 8707
 * a la letra) y responde `401` con `WWW-Authenticate` apuntando a la
 * metadata de recurso protegido cuando falta o es inválido — nunca `200`,
 * que un cliente como Claude no honra la cabecera si viene ahí.
 * `resourceUrl` acá es el **origen** (`getMcpResourceOrigin()`, sin
 * `/api/mcp`), no el identificador del recurso: es lo que `mcp-handler`
 * concatena con `resourceMetadataPath` para armar la URL de
 * `resource_metadata` del desafío — pasarle la URL con `/api/mcp` incluido
 * arma una URL de metadata que no existe (verificado a mano contra el
 * stack local, ver el comentario de `lib/mcp/config.ts`). El identificador
 * del recurso en sí (con `/api/mcp`) vive solo en
 * `app/.well-known/oauth-protected-resource/route.ts`.
 *
 * `withMcpAuth` fija `resourceUrl` por clausura en el momento en que se lo
 * llama — no admite recalcularlo por pedido. Por eso el handler se arma de
 * nuevo en cada `GET`/`POST` con el host de ese pedido puntual
 * (`getRequestHost`), para anunciar siempre el mismo dominio (`www` o no)
 * por el que el cliente MCP se conectó — el mismo que
 * `app/.well-known/oauth-protected-resource/route.ts` anuncia para ese
 * pedido.
 */
const handler = createMcpHandler(initializeMcpServer, {
  serverInfo: { name: "trazio", version: "0.1.0" },
});

function buildAuthHandler(request: Request) {
  return withMcpAuth(handler, createVerifyMcpToken(getSupabaseIssuerUrl()), {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: getMcpResourceOrigin(getRequestHost(request.headers)),
  });
}

export function GET(request: Request) {
  return buildAuthHandler(request)(request);
}

export function POST(request: Request) {
  return buildAuthHandler(request)(request);
}
