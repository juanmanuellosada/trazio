// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";
import { SettingsProvider } from "@/components/settings/settings-context";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { ComposeContextProvider } from "@/components/tasks/compose-context";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";

// `SidebarAddEvent` (bloque 7.6) necesita el contexto de preferencias
// (zona horaria, para el alta de evento) igual que `AppBadgeSync` en
// `settings-modal.test.tsx`.
const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

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

const mockUseLabels = vi.fn(() => ({ data: [] as Array<{ id: string; name: string; color: string; is_favorite: boolean }> }));
vi.mock("@/lib/labels/use-labels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/labels/use-labels")>();
  return { ...actual, useLabels: () => mockUseLabels() };
});

const STORAGE_KEY = "trazio:sidebar-collapsed";

function renderSidebar(inboxTaskCount = 0) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <ComposeContextProvider>
          <SettingsProvider>
            <AppSidebar
              fullName="Ana"
              email="ana@example.com"
              todayCount={0}
              inboxTaskCount={inboxTaskCount}
              projects={[]}
              initialProjects={[]}
            />
          </SettingsProvider>
        </ComposeContextProvider>
      </PreferencesProvider>
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

/**
 * Tests del acceso principal "Etiquetas" (`etiquetas-con-lugar-propio`,
 * requirement "Acceso 'Etiquetas' en el panel lateral"): se muestra siempre,
 * incluso sin ninguna etiqueta creada o con todas marcadas como favoritas.
 * Reapuntados de `label-filter-lists.test.tsx` (`etiquetas-sin-lista-duplicada`,
 * D-A): esos dos casos escondían el acceso cuando era la lista plegable la
 * que lo garantizaba; ahora lo garantiza este acceso principal, que no
 * depende de `useLabels` para mostrarse.
 */
describe("AppSidebar — acceso Etiquetas", () => {
  it("se muestra entre Próximos y Hábitos, con destino /etiquetas, aunque no haya ninguna etiqueta", () => {
    mockUseLabels.mockReturnValueOnce({ data: [] });
    renderSidebar();

    const mainNav = screen.getByRole("navigation", { name: "Navegación principal" });
    const labels = screen.getByRole("link", { name: "Etiquetas" });

    expect(mainNav).toContainElement(labels);
    expect(labels).toHaveAttribute("href", "/etiquetas");

    const links = Array.from(mainNav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(links.indexOf("/proximos")).toBeLessThan(links.indexOf("/etiquetas"));
    expect(links.indexOf("/etiquetas")).toBeLessThan(links.indexOf("/habitos"));
  });

  it("se muestra igual si todas las etiquetas del usuario son favoritas", () => {
    mockUseLabels.mockReturnValueOnce({
      data: [{ id: "l1", name: "Urgente", color: "amarillo", is_favorite: true }],
    });
    renderSidebar();

    const mainNav = screen.getByRole("navigation", { name: "Navegación principal" });
    const labels = screen.getByRole("link", { name: "Etiquetas" });

    expect(mainNav).toContainElement(labels);
    expect(labels).toHaveAttribute("href", "/etiquetas");
  });

  it("anuncia G E como su atajo, la misma tecla que efectivamente navega", () => {
    renderSidebar();

    const labels = screen.getByRole("link", { name: "Etiquetas" });
    expect(labels).toHaveTextContent("G");
    expect(labels).toHaveTextContent("E");
  });
});

/**
 * Contador de Bandeja de entrada: mismo patrón que el contador de Hoy
 * (`todayCount`, ver `nav-link.tsx`) — un badge junto al acceso, oculto
 * cuando no hay tareas pendientes.
 */
describe("AppSidebar — contador de Bandeja de entrada", () => {
  it("muestra la cantidad de tareas pendientes de la Bandeja", () => {
    renderSidebar(4);

    const bandeja = screen.getByRole("link", { name: "Bandeja de entrada4" });
    expect(bandeja).toHaveTextContent("4");
  });

  it("no muestra nada cuando la Bandeja no tiene tareas pendientes", () => {
    renderSidebar(0);

    const bandeja = screen.getByRole("link", { name: "Bandeja de entrada" });
    expect(bandeja).toHaveTextContent("Bandeja de entrada");
  });
});
