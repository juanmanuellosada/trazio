// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "./mobile-nav";

/**
 * Tests de la barra inferior de teléfono (bloque 8.2): los cuatro accesos de
 * "Barra inferior (teléfono)" en `docs/product-spec.md`, en orden — Bandeja
 * de entrada, Hoy, Próximos, Agregar. Antes de este bloque el cuarto lugar
 * quedaba vacío a propósito.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/bandeja" }));

function renderNav(inboxTaskCount = 0) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MobileNav
        fullName="Ana"
        email="ana@example.com"
        todayCount={0}
        inboxTaskCount={inboxTaskCount}
        projects={[]}
        initialProjects={[]}
      />
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
