// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FavoritesSection } from "./project-tree";
import type { ProjectRow } from "@/lib/projects/use-projects";
import type { Label } from "@/lib/labels/use-labels";
import type { FilterRow } from "@/lib/filters/use-filters";

/**
 * Tests de la sección Favoritos unificada (bloque 8.1, capacidades
 * `navegacion-por-etiqueta` y `filtros-guardados`): proyectos, etiquetas y
 * filtros marcados como favoritos conviven en una sola sección, que no se
 * renderiza si ninguno de los tres tiene favoritos.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/bandeja" }));

const mockUseProjects = vi.fn();
vi.mock("@/lib/projects/use-projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/projects/use-projects")>();
  return { ...actual, useProjects: () => mockUseProjects() };
});

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

const project = {
  id: "p1",
  name: "Casa",
  color: "celeste",
  icon: null,
  description: null,
  parent_id: null,
  is_inbox: false,
  is_favorite: true,
  is_archived: false,
  is_example: false,
  position: 0,
} satisfies ProjectRow;

const label = { id: "l1", name: "Urgente", color: "amarillo", is_favorite: true } satisfies Label;

const filter = {
  id: "f1",
  name: "Foco",
  query: "priority:1",
  color: "violeta",
  icon: "🎯",
  is_favorite: true,
} satisfies FilterRow;

function mockData(overrides: { projects?: ProjectRow[]; labels?: Label[]; filters?: FilterRow[] } = {}) {
  mockUseProjects.mockReturnValue({ data: overrides.projects ?? [] });
  mockUseLabels.mockReturnValue({ data: overrides.labels ?? [] });
  mockUseFilters.mockReturnValue({ data: overrides.filters ?? [] });
}

describe("FavoritesSection", () => {
  it("no renderiza nada si no hay proyectos, etiquetas ni filtros favoritos", () => {
    mockData();
    const { container } = render(<FavoritesSection initialProjects={[]} taskCounts={new Map()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra un proyecto, una etiqueta y un filtro favoritos juntos bajo 'Favoritos'", () => {
    mockData({ projects: [project], labels: [label], filters: [filter] });
    render(<FavoritesSection initialProjects={[project]} taskCounts={new Map()} />);

    expect(screen.getByText("Favoritos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Casa/ })).toHaveAttribute("href", "/proyecto/p1");
    expect(screen.getByRole("link", { name: "Urgente" })).toHaveAttribute("href", "/etiquetas/l1");
    expect(screen.getByRole("link", { name: "Foco" })).toHaveAttribute("href", "/filtros/f1");
  });

  it("una etiqueta no favorita no aparece en Favoritos", () => {
    mockData({ labels: [{ ...label, is_favorite: false }] });
    const { container } = render(<FavoritesSection initialProjects={[]} taskCounts={new Map()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
