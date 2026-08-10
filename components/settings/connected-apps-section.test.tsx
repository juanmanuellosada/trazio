// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { ConnectedAppsSection } from "./connected-apps-section";

// Tarea 5.6 de `servidor-mcp`: tests de la sección "Aplicaciones
// conectadas". A diferencia de `calendars-section.test.tsx` (que mockea
// `fetch`), acá se mockea `supabase-js` porque `use-connected-apps.ts` llama
// directo a `auth.oauth.listGrants`/`revokeGrant` — mismo patrón que
// `account-section.test.tsx`.

vi.mock("@/lib/supabase/client", () => {
  const listGrants = vi.fn();
  const revokeGrant = vi.fn();
  return {
    createClient: () => ({ auth: { oauth: { listGrants, revokeGrant } } }),
    __mock: { listGrants, revokeGrant },
  };
});

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

const { listGrants, revokeGrant } = (
  supabaseClientModule as unknown as {
    __mock: { listGrants: ReturnType<typeof vi.fn>; revokeGrant: ReturnType<typeof vi.fn> };
  }
).__mock;

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return writeText;
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ConnectedAppsSection />
    </QueryClientProvider>,
  );
}

describe("ConnectedAppsSection (servidor-mcp 5.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin ninguna aplicación autorizada, explica qué va a aparecer ahí en vez de una pantalla en blanco", async () => {
    listGrants.mockResolvedValue({ data: [], error: null });
    renderSection();

    expect(await screen.findByText(/todavía no autorizaste ningún asistente de ia/i)).toBeInTheDocument();
  });

  it("lista las aplicaciones autorizadas con nombre y desde cuándo tienen acceso", async () => {
    listGrants.mockResolvedValue({
      data: [
        { client: { id: "client-1", name: "Claude" }, scopes: ["openid", "email"], granted_at: "2026-08-10T18:44:21.210Z" },
      ],
      error: null,
    });
    renderSection();

    expect(await screen.findByText("Claude")).toBeInTheDocument();
    expect(screen.getByText(/desde el 10 de agosto de 2026/i)).toBeInTheDocument();
  });

  it("cortar el acceso llama a revokeGrant con el client_id y confirma con un toast, sin diálogo de confirmación", async () => {
    listGrants.mockResolvedValue({
      data: [{ client: { id: "client-1", name: "Claude" }, scopes: ["openid"], granted_at: "2026-08-10T18:44:21.210Z" }],
      error: null,
    });
    revokeGrant.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Cortar acceso" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(revokeGrant).toHaveBeenCalledWith({ clientId: "client-1" }));
  });

  it("un error al cargar avisa que se cortó la conexión", async () => {
    listGrants.mockResolvedValue({ data: null, error: new Error("network error") });
    renderSection();

    expect(await screen.findByText(/no pudimos cargar tus aplicaciones conectadas/i)).toBeInTheDocument();
  });

  it("la URL del servidor MCP se ve siempre, incluso sin ninguna aplicación conectada", async () => {
    listGrants.mockResolvedValue({ data: [], error: null });
    renderSection();

    await screen.findByText(/todavía no autorizaste ningún asistente de ia/i);
    const input = screen.getByDisplayValue(/\/api\/mcp$/) as HTMLInputElement;
    expect(input).toHaveAttribute("readOnly");
  });

  it("copiar la URL del servidor MCP la manda al portapapeles y confirma con un toast", async () => {
    listGrants.mockResolvedValue({ data: [], error: null });
    // `userEvent.setup()` instala su propio stub de `navigator.clipboard`
    // (`Clipboard.attachClipboardStubToView`), así que `stubClipboard()` va
    // después de `setup()`, no antes, o `setup()` lo vuelve a tapar.
    const user = userEvent.setup();
    const writeText = stubClipboard();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Copiar URL del servidor MCP" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/api\/mcp$/));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("URL copiada."));
  });
});
