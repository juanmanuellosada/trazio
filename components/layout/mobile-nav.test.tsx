// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "./mobile-nav";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";

// `usePendingTodayCount` (badge de "Hoy", ya no una prop congelada) necesita
// el contexto de preferencias igual que `AppBadgeSync`.
const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

/**
 * Tests de la barra inferior de teléfono (bloque 8.2): los cuatro accesos de
 * "Barra inferior (teléfono)" en `docs/product-spec.md`, en orden — Bandeja
 * de entrada, Hoy, Próximos, Agregar. Antes de este bloque el cuarto lugar
 * quedaba vacío a propósito.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/bandeja", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/shortcuts/global-quick-add-dialog", () => ({
  GlobalQuickAddDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">Nueva tarea</div> : null),
}));
vi.mock("@/components/calendar/create-event-dialog", () => ({ CreateEventDialog: () => null }));
vi.mock("@/components/search/search-palette", () => ({ SearchPalette: () => null }));

function renderNav(inboxTaskCount = 0) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <MobileNav
          fullName="Ana"
          email="ana@example.com"
          avatarUrl={null}
          inboxTaskCount={inboxTaskCount}
          projects={[]}
          initialProjects={[]}
        />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("MobileNav — barra inferior", () => {
  it("muestra los cuatro accesos en el orden del spec", () => {
    renderNav();

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    const items = nav.querySelectorAll("a, button");
    const labels = Array.from(items).map((el) => el.textContent?.trim());

    expect(labels).toEqual(["Bandeja", "Hoy", "Próximos", "Agregar"]);
  });

  it("Próximos enlaza a /proximos", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Próximos" })).toHaveAttribute("href", "/proximos");
  });
});

describe("MobileNav — botón Agregar", () => {
  it("abre el diálogo global de alta rápida", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider preferences={PREFERENCES}>
          <ShortcutProvider inboxProjectId="inbox">
            <MobileNav fullName="Ana" email="ana@example.com" avatarUrl={null} inboxTaskCount={0} projects={[]} initialProjects={[]} />
          </ShortcutProvider>
        </PreferencesProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Agregar tarea" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Nueva tarea");
  });
});

/**
 * Contador de Bandeja (mismo patrón que el contador de Hoy, `todayCount`):
 * un dígito superpuesto al ícono, oculto cuando no hay tareas pendientes.
 */
describe("MobileNav — contador de Bandeja", () => {
  it("muestra la cantidad de tareas pendientes de la Bandeja", () => {
    renderNav(3);
    expect(screen.getByRole("link", { name: "3Bandeja" })).toHaveTextContent("3");
  });

  it("no muestra nada cuando la Bandeja no tiene tareas pendientes", () => {
    renderNav(0);
    expect(screen.getByRole("link", { name: "Bandeja" })).toHaveTextContent("Bandeja");
  });
});
