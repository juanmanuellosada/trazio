// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { DeleteExampleContentDialog } from "./delete-example-content-dialog";
import type { ProjectRow } from "@/lib/projects/use-projects";

/**
 * Mismo patrón de mock que `delete-project-dialog.test.tsx`, con dos tablas
 * más: `useDeleteExampleContent` (tarea 4.3) borra `habits` y `filters`
 * además de `projects`, así que acá se distingue cada una para verificar
 * que la acción se lleva a las tres.
 */
vi.mock("@/lib/supabase/client", () => {
  const inFn = vi.fn();
  const select = vi.fn(() => ({ in: inFn }));

  const projectsEq = vi.fn();
  const projectsDelete = vi.fn(() => ({ eq: projectsEq }));

  const habitsEq = vi.fn();
  const habitsDelete = vi.fn(() => ({ eq: habitsEq }));

  const filtersEq = vi.fn();
  const filtersDelete = vi.fn(() => ({ eq: filtersEq }));

  const from = vi.fn((table: string) => {
    if (table === "habits") return { delete: habitsDelete };
    if (table === "filters") return { delete: filtersDelete };
    if (table === "projects") return { select, delete: projectsDelete };
    return { select, delete: projectsDelete };
  });

  return {
    createClient: () => ({ from }),
    __mock: { from, select, in: inFn, projectsEq, projectsDelete, habitsEq, habitsDelete, filtersEq, filtersDelete },
  };
});

const { in: inMock, projectsEq, habitsEq, habitsDelete, filtersEq, filtersDelete, projectsDelete } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
      projectsEq: ReturnType<typeof vi.fn>;
      projectsDelete: ReturnType<typeof vi.fn>;
      habitsEq: ReturnType<typeof vi.fn>;
      habitsDelete: ReturnType<typeof vi.fn>;
      filtersEq: ReturnType<typeof vi.fn>;
      filtersDelete: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

const project: ProjectRow = {
  id: "project-ejemplos",
  name: "Ejemplos",
  color: "celeste",
  icon: "💡",
  description: null,
  parent_id: null,
  is_inbox: false,
  is_favorite: false,
  is_archived: false,
  is_example: true,
  position: 1000,
};

function renderDialog(taskCount: number) {
  inMock.mockResolvedValue({ count: taskCount, error: null });
  projectsEq.mockResolvedValue({ error: null });
  habitsEq.mockResolvedValue({ error: null });
  filtersEq.mockResolvedValue({ error: null });

  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteExampleContentDialog open onOpenChange={() => {}} project={project} allProjects={[project]} />
    </QueryClientProvider>,
  );
}

describe("DeleteExampleContentDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menciona el proyecto, el conteo de tareas, el hábito y el filtro en la confirmación", async () => {
    renderDialog(4);
    expect(
      await screen.findByText(/eliminar el proyecto “ejemplos” con 4 tareas, el hábito de ejemplo y el filtro de ejemplo/i),
    ).toBeInTheDocument();
  });

  it("al confirmar, borra el hábito de ejemplo, el filtro de ejemplo y el proyecto (tarea 4.3)", async () => {
    const user = userEvent.setup();
    renderDialog(4);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Eliminar de forma permanente" })).not.toBeDisabled(),
    );
    await user.click(screen.getByRole("button", { name: "Eliminar de forma permanente" }));

    await waitFor(() => expect(projectsDelete).toHaveBeenCalled());
    expect(habitsDelete).toHaveBeenCalled();
    expect(habitsEq).toHaveBeenCalledWith("is_example", true);
    expect(filtersDelete).toHaveBeenCalled();
    expect(filtersEq).toHaveBeenCalledWith("is_example", true);
    expect(projectsEq).toHaveBeenCalledWith("id", "project-ejemplos");
  });
});
