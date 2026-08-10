import { describe, expect, it, vi } from "vitest";
import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { initializeMcpServer } from "./server";

const EXPECTED_TOOLS = ["consultar_tareas", "obtener_tarea", "listar_estructura", "listar_habitos"];

function fakeServerContext(token?: string): ServerContext {
  return { http: token ? { authInfo: { token, clientId: "c1", scopes: [] } } : undefined } as unknown as ServerContext;
}

describe("initializeMcpServer", () => {
  it("registra exactamente las cuatro herramientas de lectura de la Ola 6, cada una con su inputSchema", () => {
    const registerTool = vi.fn();
    initializeMcpServer({ registerTool } as unknown as McpServer);

    expect(registerTool).toHaveBeenCalledTimes(4);
    const registeredNames = registerTool.mock.calls.map((call) => call[0]);
    expect(registeredNames.sort()).toEqual([...EXPECTED_TOOLS].sort());

    for (const call of registerTool.mock.calls) {
      const [, config, handler] = call;
      expect(config.inputSchema).toBeDefined();
      expect(typeof handler).toBe("function");
    }
  });

  it("ninguna herramienta expone borrado: los nombres registrados no incluyen nada que empiece con 'borrar' o 'eliminar'", () => {
    const registerTool = vi.fn();
    initializeMcpServer({ registerTool } as unknown as McpServer);

    const registeredNames = registerTool.mock.calls.map((call) => call[0] as string);
    for (const name of registeredNames) {
      expect(name).not.toMatch(/^(borrar|eliminar)/);
    }
  });

  it("sin access token en ctx.http.authInfo, cada herramienta rechaza sin tocar la base", async () => {
    const registerTool = vi.fn();
    initializeMcpServer({ registerTool } as unknown as McpServer);

    for (const call of registerTool.mock.calls) {
      const handler = call[2] as (args: Record<string, unknown>, ctx: ServerContext) => Promise<{ isError?: boolean; content: { text: string }[] }>;
      const result = await handler({}, fakeServerContext(undefined));
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/no autenticado/i);
    }
  });
});
