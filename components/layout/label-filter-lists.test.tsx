// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LabelsCollapsibleList, FiltersCollapsibleList } from "./label-filter-lists";
import type { Label } from "@/lib/labels/use-labels";
import type { FilterRow } from "@/lib/filters/use-filters";

/**
 * Tests de las listas colapsables de etiquetas y filtros (bloque 8.3/8.4):
 * solo listan los ítems no favoritos (los favoritos ya están en la sección
 * Favoritos), no se renderizan si no queda ninguno, y expandir/contraer
 * muestra u oculta la lista.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/bandeja" }));

const mockUseLabels = vi.fn();
vi.mock("@/lib/labels/use-labels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/labels/use-labels")>();
  return { ...actual, useLabels: () => mockUseLabels() };
});

const mockUseFilters = vi.fn();
vi.mock("@/lib/filters/use-filters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/filters/use-filters")>();
  return { ...actual, useFilters: () => mockUseFilters() };
});

const favoriteLabel = { id: "l1", name: "Compras", color: "amarillo", is_favorite: true } satisfies Label;
const plainLabel = { id: "l2", name: "Lectura", color: "verde", is_favorite: false } satisfies Label;

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

describe("LabelsCollapsibleList", () => {
  it("no renderiza nada si todas las etiquetas son favoritas", () => {
    mockUseLabels.mockReturnValue({ data: [favoriteLabel] });
    const { container } = render(<LabelsCollapsibleList />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista las etiquetas no favoritas, sin las favoritas, al expandir", async () => {
    const user = userEvent.setup();
    mockUseLabels.mockReturnValue({ data: [favoriteLabel, plainLabel] });
    render(<LabelsCollapsibleList />);

    expect(screen.getByRole("button", { name: /Etiquetas/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Lectura" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Etiquetas/ }));

    expect(await screen.findByRole("link", { name: "Lectura" })).toHaveAttribute("href", "/etiquetas/l2");
    expect(screen.queryByRole("link", { name: "Compras" })).not.toBeInTheDocument();
  });
});

describe("FiltersCollapsibleList", () => {
  it("no renderiza nada si todos los filtros son favoritos", () => {
    mockUseFilters.mockReturnValue({ data: [favoriteFilter] });
    const { container } = render(<FiltersCollapsibleList />);
    expect(container).toBeEmptyDOMElement();
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
