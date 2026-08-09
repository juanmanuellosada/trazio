// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FiltersCollapsibleList } from "./label-filter-lists";
import type { FilterRow } from "@/lib/filters/use-filters";

/**
 * Tests de la lista colapsable de filtros (bloque 8.4, `filtros-alcanzables`
 * bloque 3): solo lista los no favoritos (los favoritos ya están en la
 * sección Favoritos), nunca desaparece por estar vacía —requirement "La
 * lista de filtros no desaparece por estar vacía"—, y expandir/contraer
 * muestra u oculta la lista cuando sí hay alguno. La de etiquetas se sacó
 * en `etiquetas-sin-lista-duplicada` (D-A); sus casos de cero etiquetas y
 * todas favoritas se reapuntaron a `app-sidebar.test.tsx`, describe
 * "AppSidebar — acceso Etiquetas".
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/bandeja" }));

const mockUseFilters = vi.fn();
vi.mock("@/lib/filters/use-filters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/filters/use-filters")>();
  return { ...actual, useFilters: () => mockUseFilters() };
});

const favoriteFilter = {
  id: "f1",
  name: "Urgente",
  query: "priority:1",
  color: "violeta",
  icon: null,
  is_favorite: true,
} satisfies FilterRow;
const plainFilter = {
  id: "f2",
  name: "Sin etiqueta",
  query: "no_project:true",
  color: "celeste",
  icon: null,
  is_favorite: false,
} satisfies FilterRow;

describe("FiltersCollapsibleList", () => {
  it("sin ningún filtro, muestra el estado vacío con acceso a crear el primero", () => {
    mockUseFilters.mockReturnValue({ data: [] });
    render(<FiltersCollapsibleList />);

    expect(screen.getByText("Todavía no tenés filtros.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Creá el primero" })).toHaveAttribute("href", "/filtros");
  });

  it("si todos los filtros son favoritos, muestra el mismo estado vacío (no quedan no favoritos que listar)", () => {
    mockUseFilters.mockReturnValue({ data: [favoriteFilter] });
    render(<FiltersCollapsibleList />);

    expect(screen.getByText("Todavía no tenés filtros.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Urgente" })).not.toBeInTheDocument();
  });

  it("lista los filtros no favoritos al expandir", async () => {
    const user = userEvent.setup();
    mockUseFilters.mockReturnValue({ data: [favoriteFilter, plainFilter] });
    render(<FiltersCollapsibleList />);

    await user.click(screen.getByRole("button", { name: /Filtros/ }));

    expect(await screen.findByRole("link", { name: "Sin etiqueta" })).toHaveAttribute("href", "/filtros/f2");
    expect(screen.queryByRole("link", { name: "Urgente" })).not.toBeInTheDocument();
  });
});
