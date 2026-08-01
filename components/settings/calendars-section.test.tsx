// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarsSection } from "./calendars-section";

// Tarea 4.2: tests de la sección de administración de calendarios. Todo el
// acceso a datos pasa por `fetch("/api/calendar/...")` (no por
// `supabase-js`, ver `lib/calendar/use-google-calendars.ts`), así que se
// mockea `fetch` con un router chico en vez de mockear un cliente de
// Supabase.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const CALENDARS_BODY = {
  calendars: [
    { id: "primary", summary: "Juan", backgroundColor: "#a4bdfc", primary: true },
    { id: "trabajo@group.calendar.google.com", summary: "Trabajo", backgroundColor: "#7ae7bf", primary: false },
  ],
  enabledCalendarIds: ["primary"],
};

const COLORS_BODY = {
  colors: [
    { id: "1", background: "#a4bdfc", foreground: "#1d1d1d" },
    { id: "2", background: "#7ae7bf", foreground: "#1d1d1d" },
  ],
};

function mockFetchRouter(overrides: { calendars?: Response; colors?: Response } = {}) {
  const calls: { url: string; method: string; body?: unknown }[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body ? JSON.parse(init.body as string) : undefined });

      if (url === "/api/calendar/calendars" && method === "GET") {
        return overrides.calendars ?? jsonResponse(200, CALENDARS_BODY);
      }
      if (url === "/api/calendar/calendars" && method === "POST") {
        return jsonResponse(201, { calendar: { id: "nuevo-id", summary: (init?.body ? JSON.parse(init.body as string) : {}).name } });
      }
      if (url === "/api/calendar/calendars" && method === "PATCH") {
        return jsonResponse(200, { ok: true });
      }
      if (url === "/api/calendar/calendars/colors" && method === "GET") {
        return overrides.colors ?? jsonResponse(200, COLORS_BODY);
      }
      if (url.startsWith("/api/calendar/calendars/") && method === "PATCH") {
        return jsonResponse(200, { ok: true });
      }
      if (url.startsWith("/api/calendar/calendars/") && method === "DELETE") {
        return jsonResponse(200, { ok: true });
      }
      if (url === "/api/auth/google/disconnect" && method === "POST") {
        return jsonResponse(200, { ok: true });
      }
      throw new Error(`Ruta no mockeada: ${method} ${url}`);
    }),
  );

  return calls;
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CalendarsSection />
    </QueryClientProvider>,
  );
}

describe("CalendarsSection (tarea 4.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin conexión con Google, ofrece conectar y no ofrece administrar (tarea 7.10)", async () => {
    mockFetchRouter({ calendars: jsonResponse(404, { error: "not_connected" }) });
    renderSection();

    expect(await screen.findByText("Sin conexión con Google")).toBeInTheDocument();
    const connectLink = screen.getByRole("link", { name: "Conectar con Google" });
    expect(connectLink).toHaveAttribute("href", "/api/auth/google");
    expect(screen.queryByRole("button", { name: /nuevo calendario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desconectar" })).not.toBeInTheDocument();
  });

  it("con la conexión rota, distingue el estado de una conexión activa y ofrece reconectar (spec configuracion)", async () => {
    mockFetchRouter({ calendars: jsonResponse(409, { error: "needs_reauth" }) });
    renderSection();

    expect(await screen.findByText("La conexión necesita reconectarse")).toBeInTheDocument();
    const reconnectLink = screen.getByRole("link", { name: "Reconectar" });
    expect(reconnectLink).toHaveAttribute("href", "/api/auth/google");
  });

  it("con conexión activa, muestra el estado y ofrece desconectar (tarea 7.10)", async () => {
    const calls = mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText("Conectado con Google")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desconectar" }));

    await waitFor(() =>
      expect(calls).toContainEqual(expect.objectContaining({ url: "/api/auth/google/disconnect", method: "POST" })),
    );
  });

  it("lista los calendarios, marca el principal y no deja eliminarlo", async () => {
    mockFetchRouter();
    renderSection();

    expect(await screen.findByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Juan")).toBeInTheDocument();
    expect(screen.getByText("Principal")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /no se puede eliminar juan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eliminar Trabajo" })).not.toBeDisabled();
  });

  it("elegir qué calendarios se muestran en Trazio (spec configuracion, requirement 'Elegir qué calendarios se muestran')", async () => {
    const calls = mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    await screen.findByText("Trabajo");
    const juanCheckbox = screen.getByRole("checkbox", { name: "Dejar de mostrar Juan en Trazio" });
    const trabajoCheckbox = screen.getByRole("checkbox", { name: "Mostrar Trabajo en Trazio" });
    expect(juanCheckbox).toHaveAttribute("aria-checked", "true");
    expect(trabajoCheckbox).toHaveAttribute("aria-checked", "false");

    await user.click(trabajoCheckbox);

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          url: "/api/calendar/calendars",
          method: "PATCH",
          body: { enabledCalendarIds: ["primary", "trabajo@group.calendar.google.com"] },
        }),
      ),
    );
  });

  it("eliminar un calendario secundario advierte que se borra de la cuenta de Google entera, no solo de Trazio", async () => {
    const calls = mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Eliminar Trabajo" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/cuenta de google entera, no solo de trazio/i);
    expect(dialog).toHaveTextContent(/no se puede deshacer desde acá/i);

    await user.click(screen.getByRole("button", { name: "Eliminar de tu cuenta de Google" }));

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          url: "/api/calendar/calendars/trabajo%40group.calendar.google.com",
          method: "DELETE",
        }),
      ),
    );
  });

  it("cerrar la confirmación sin confirmar no llama a eliminar", async () => {
    const calls = mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Eliminar Trabajo" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("crear un calendario no deja mandar un nombre vacío", async () => {
    const calls = mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: /nuevo calendario/i }));
    await user.click(screen.getByRole("button", { name: "Crear calendario" }));

    expect(await screen.findByText(/falta el nombre del calendario/i)).toBeInTheDocument();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("crear un calendario manda el nombre a la API", async () => {
    const calls = mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: /nuevo calendario/i }));
    await user.type(screen.getByLabelText("Nombre"), "Personal");
    await user.click(screen.getByRole("button", { name: "Crear calendario" }));

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({ url: "/api/calendar/calendars", method: "POST", body: { name: "Personal" } }),
      ),
    );
  });

  it("editar precarga el nombre y el color actual del calendario", async () => {
    mockFetchRouter();
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Editar Trabajo" }));

    expect(screen.getByRole("heading", { name: "Editar calendario" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Trabajo");

    // El color de "Trabajo" (#7ae7bf) matchea el colorId "2" de la paleta
    // de Google mockeada: ese swatch queda marcado como elegido.
    await waitFor(() => expect(screen.getByRole("button", { name: "Color 2 de Google" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "Color 1 de Google" })).toHaveAttribute("aria-pressed", "false");
  });
});
