// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { SettingsProvider, useSettings } from "./settings-context";
import { SettingsModal } from "./settings-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

/**
 * Mock de `createClient()` para el modal (bloque 9): `useSettingsData`
 * resuelve el usuario con `auth.getUser()` (necesita `identities`, que no
 * viaja en el JWT) y después lee `profiles`/`user_preferences` por id —
 * acá alcanza con devolver una fila fija por tabla, sin encadenar filtros.
 */
vi.mock("@/lib/supabase/client", () => {
  const getUser = vi.fn();
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => {
          if (table === "profiles") return Promise.resolve({ data: { full_name: "Juan" }, error: null });
          if (table === "user_preferences") {
            return Promise.resolve({
              data: {
                timezone: "America/Argentina/Buenos_Aires",
                date_format: "dd-MM-yyyy",
                time_format: 24,
                week_starts_on: 1,
                default_view: "bandeja",
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  }));
  return {
    createClient: () => ({
      from,
      auth: { getUser, signInWithPassword: vi.fn(), updateUser: vi.fn(), unlinkIdentity: vi.fn() },
    }),
    __mock: { getUser },
  };
});

const { getUser } = (supabaseClientModule as unknown as { __mock: { getUser: ReturnType<typeof vi.fn> } }).__mock;

function OpenButton() {
  const { open } = useSettings();
  return (
    <button type="button" onClick={open}>
      Abrir configuración
    </button>
  );
}

function renderModal() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <OpenButton />
        <SettingsModal />
      </SettingsProvider>
    </QueryClientProvider>,
  );
}

async function openModal() {
  const user = userEvent.setup();
  renderModal();
  await user.click(screen.getByRole("button", { name: "Abrir configuración" }));
  await screen.findByRole("dialog", { name: "Configuración" });
  await waitFor(() => expect(screen.getByLabelText("Nombre")).toBeInTheDocument());
  return user;
}

describe("SettingsModal (bloque 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "juan@trazio.com.ar",
          identities: [{ id: "e1", user_id: "user-1", identity_id: "e1", provider: "email" }],
        },
      },
      error: null,
    });
  });

  it("abre por encima de la pantalla, sin navegar a una ruta separada", async () => {
    await openModal();
    // La navegación de la app (`useRouter().refresh`) no se usó para abrir:
    // el modal ya está montado desde antes en el layout (`useSettings`).
    expect(screen.getByRole("dialog", { name: "Configuración" })).toBeInTheDocument();
  });

  it("muestra las cinco secciones de fase 2, con Notificaciones y sin Calendarios", async () => {
    await openModal();

    const nav = screen.getByRole("navigation", { name: "Secciones de configuración" });
    expect(within(nav).getByRole("button", { name: "Cuenta" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "General" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Tema" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Instalación" })).toBeInTheDocument();
    expect(within(nav).getAllByRole("button")).toHaveLength(5);

    expect(screen.queryByText(/calendarios/i)).not.toBeInTheDocument();
  });

  it("navega entre secciones: elegir General la marca activa y muestra su contenido", async () => {
    const user = await openModal();

    expect(screen.getByTestId("panel-cuenta")).not.toHaveClass("hidden");
    expect(screen.getByTestId("panel-general")).toHaveClass("hidden");
    expect(screen.getByRole("button", { name: "Cuenta" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "General" }));

    expect(screen.getByRole("button", { name: "General" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Cuenta" })).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("panel-general")).not.toHaveClass("hidden");
    expect(screen.getByTestId("panel-cuenta")).toHaveClass("hidden");
    expect(screen.getByLabelText("Zona horaria")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tema" }));
    expect(screen.getByTestId("panel-tema")).not.toHaveClass("hidden");
    expect(screen.getByTestId("panel-general")).toHaveClass("hidden");
  });

  it("cerrar con Escape y volver a abrir empieza de nuevo en Cuenta", async () => {
    const user = await openModal();

    await user.click(screen.getByRole("button", { name: "General" }));
    expect(screen.getByTestId("panel-general")).not.toHaveClass("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Abrir configuración" }));
    await screen.findByRole("dialog", { name: "Configuración" });
    await waitFor(() => expect(screen.getByTestId("panel-cuenta")).not.toHaveClass("hidden"));
  });
});
