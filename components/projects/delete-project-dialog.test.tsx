// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { DeleteProjectDialog } from "./delete-project-dialog";
import type { ProjectRow } from "@/lib/projects/use-projects";

vi.mock("@/lib/supabase/client", () => {
  const inFn = vi.fn();
  const select = vi.fn(() => ({ in: inFn }));
  const eq = vi.fn();
  const deleteFn = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, delete: deleteFn }));
  return {
    createClient: () => ({ from }),
    __mock: { from, select, in: inFn, eq, delete: deleteFn },
  };
});

const { select, in: inMock, eq, delete: deleteMock } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

const project: ProjectRow = {
  id: "root",
  name: "Trabajo",
  color: "celeste",
  icon: null,
  description: null,
  parent_id: null,
  is_inbox: false,
  is_favorite: false,
  is_archived: false,
  is_example: false,
  position: 1000,
};

const child: ProjectRow = { ...project, id: "child", name: "Subproyecto", parent_id: "root" };
const grandchild: ProjectRow = { ...project, id: "grandchild", name: "Nieto", parent_id: "child" };
const unrelated: ProjectRow = { ...project, id: "otro", name: "Otro proyecto", parent_id: null };

function renderDialog(taskCount: number, allProjects: ProjectRow[]) {
  inMock.mockResolvedValue({ count: taskCount, error: null });
  eq.mockResolvedValue({ error: null });

  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteProjectDialog open onOpenChange={() => {}} project={project} allProjects={allProjects} />
    </QueryClientProvider>,
  );
}

describe("DeleteProjectDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cuenta las tareas de todo el subárbol, no solo las del proyecto raíz", async () => {
    renderDialog(12, [project, child, grandchild, unrelated]);

    await waitFor(() => expect(inMock).toHaveBeenCalled());
    expect(inMock).toHaveBeenCalledWith("project_id", ["root", "child", "grandchild"]);
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });

    expect(await screen.findByText(/se van a eliminar 12 tareas/i)).toBeInTheDocument();
  });

  it("muestra el singular cuando hay una sola tarea", async () => {
    renderDialog(1, [project]);
    expect(await screen.findByText(/se van a eliminar 1 tarea de este proyecto/i)).toBeInTheDocument();
  });

  it("avisa que no hay tareas cuando el conteo es cero", async () => {
    renderDialog(0, [project]);
    expect(await screen.findByText(/este proyecto no tiene tareas/i)).toBeInTheDocument();
  });

  it("deshabilita confirmar mientras cuenta, y elimina el proyecto raíz al confirmar", async () => {
    const user = userEvent.setup();
    renderDialog(3, [project]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Eliminar de forma permanente" })).not.toBeDisabled(),
    );

    await user.click(screen.getByRole("button", { name: "Eliminar de forma permanente" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(eq).toHaveBeenCalledWith("id", "root");
  });
});
