// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import { ProjectHeader } from "./project-header";

/**
 * Tests del ítem "Copiar como markdown" del menú "…" del header de proyecto
 * (`openspec/changes/copiar-un-proyecto-como-markdown/`, ola 4). El patrón
 * de abrir un menú de Base UI con `userEvent.click` + `screen.findByRole`
 * ya tiene precedente en el repo: `components/layout/account-menu.test.tsx`
 * usa el mismo `components/ui/dropdown-menu.tsx`.
 *
 * Los diálogos, `ViewOptionsBar` y las mutaciones se mockean: lo que
 * importa acá es el cableado del ítem de menú nuevo, no el resto del
 * header (ya cubierto en otro lado o fuera del alcance de esta ola).
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/projects/mutations", () => ({
  useUpdateProject: () => ({ mutate: vi.fn() }),
  useDuplicateProject: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/lib/projects/share-link", () => ({ useProjectShareLink: () => ({ data: null }) }));
vi.mock("@/components/view-options/view-options-bar", () => ({ ViewOptionsBar: () => null }));
vi.mock("./project-form-dialog", () => ({ ProjectFormDialog: () => null }));
vi.mock("./delete-project-dialog", () => ({ DeleteProjectDialog: () => null }));
vi.mock("./delete-example-content-dialog", () => ({ DeleteExampleContentDialog: () => null }));
vi.mock("./share-project-dialog", () => ({ ShareProjectDialog: () => null }));

const copyProjectMarkdown = vi.fn();
const prefetchProjectMarkdownSources = vi.fn();
vi.mock("@/lib/projects/copy-project-markdown", () => ({
  copyProjectMarkdown: (...args: unknown[]) => copyProjectMarkdown(...args),
  prefetchProjectMarkdownSources: (...args: unknown[]) => prefetchProjectMarkdownSources(...args),
}));

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: "p1",
    name: "Proyecto Test",
    color: null,
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    is_example: false,
    position: 0,
    ...overrides,
  };
}

function renderHeader(p: ProjectRow) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectHeader
        project={p}
        allProjects={[p]}
        viewKey={`proyecto:${p.id}`}
        initialOptions={defaultOptionsForViewKey(`proyecto:${p.id}`)}
      />
    </QueryClientProvider>,
  );
}

describe("ProjectHeader — Copiar como markdown", () => {
  beforeEach(() => {
    copyProjectMarkdown.mockClear();
    prefetchProjectMarkdownSources.mockClear();
  });

  it("el menú ofrece 'Copiar como markdown'", async () => {
    const user = userEvent.setup();
    renderHeader(project());

    await user.click(screen.getByRole("button", { name: "Más acciones del proyecto" }));

    expect(await screen.findByRole("menuitem", { name: "Copiar como markdown" })).toBeInTheDocument();
  });

  it("el clic llama a copyProjectMarkdown con el proyecto", async () => {
    const user = userEvent.setup();
    const p = project();
    renderHeader(p);

    await user.click(screen.getByRole("button", { name: "Más acciones del proyecto" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copiar como markdown" }));

    expect(copyProjectMarkdown).toHaveBeenCalledTimes(1);
    expect(copyProjectMarkdown.mock.calls[0]?.[1]).toEqual(p);
  });

  it("abrir el menú dispara el prefetch de las descripciones", async () => {
    const user = userEvent.setup();
    const p = project();
    renderHeader(p);

    expect(prefetchProjectMarkdownSources).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Más acciones del proyecto" }));
    await screen.findByRole("menu");

    expect(prefetchProjectMarkdownSources).toHaveBeenCalledTimes(1);
    expect(prefetchProjectMarkdownSources.mock.calls[0]?.[1]).toBe(p.id);
  });

  it("la Bandeja de entrada no renderiza el disparador 'Más acciones del proyecto'", () => {
    renderHeader(project({ is_inbox: true }));

    expect(screen.queryByRole("button", { name: "Más acciones del proyecto" })).not.toBeInTheDocument();
  });
});
