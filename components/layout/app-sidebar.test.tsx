// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";
import { SettingsProvider } from "@/components/settings/settings-context";

/**
 * Tests del panel lateral de escritorio (bloque 10.4): que el colapso se
 * guarde en `localStorage` (preferencia del dispositivo, no de la cuenta,
 * D. ver el comentario de `app-sidebar.tsx`) y se recupere al volver a
 * montar. Sin proyectos (`initialProjects`/`projects` vacíos) para no
 * arrastrar el árbol de proyectos completo a un test que no lo necesita.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "system", setTheme: vi.fn() }) }));
vi.mock("@/lib/preferences/theme-action", () => ({ updateThemePreference: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/bandeja",
}));

const STORAGE_KEY = "trazio:sidebar-collapsed";

function renderSidebar() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AppSidebar fullName="Ana" email="ana@example.com" todayCount={0} projects={[]} initialProjects={[]} />
      </SettingsProvider>
    </QueryClientProvider>,
  );
}

describe("AppSidebar — colapso", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("arranca expandido cuando no hay preferencia guardada", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "Colapsar panel lateral" })).toBeInTheDocument();
  });

  it("al colapsar, guarda la preferencia en localStorage", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Colapsar panel lateral" }));

    expect(await screen.findByRole("button", { name: "Expandir panel lateral" })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("si ya estaba colapsado en localStorage, vuelve a montar colapsado", async () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    renderSidebar();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expandir panel lateral" })).toBeInTheDocument();
    });
  });

  it("expandir después de colapsado vuelve a guardar la preferencia", async () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    const user = userEvent.setup();
    renderSidebar();

    const toggle = await screen.findByRole("button", { name: "Expandir panel lateral" });
    await user.click(toggle);

    expect(await screen.findByRole("button", { name: "Colapsar panel lateral" })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("0");
  });
});
