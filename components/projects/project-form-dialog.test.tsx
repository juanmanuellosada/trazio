// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { ProjectFormDialog } from "./project-form-dialog";
import type { ProjectRow } from "@/lib/projects/use-projects";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

vi.mock("@/lib/supabase/client", () => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const eq = vi.fn();
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ insert, update }));
  const getSession = vi.fn();
  return {
    createClient: () => ({ from, auth: { getSession } }),
    __mock: { from, insert, select, single, update, eq, getSession },
  };
});

const { insert, single, update, eq, getSession } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

function renderDialog(props: Partial<React.ComponentProps<typeof ProjectFormDialog>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectFormDialog open onOpenChange={() => {}} parentId={null} {...props} />
    </QueryClientProvider>,
  );
}

const existingProject: ProjectRow = {
  id: "project-1",
  name: "Trabajo",
  color: "celeste",
  icon: "💼",
  description: "Tareas del laburo",
  parent_id: null,
  is_inbox: false,
  is_favorite: false,
  is_archived: false,
  is_example: false,
  position: 1000,
};

describe("ProjectFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    single.mockResolvedValue({
      data: { ...existingProject, id: "new-id" },
      error: null,
    });
    eq.mockResolvedValue({ error: null });
  });

  it("muestra un error de validación cuando falta el nombre y no crea el proyecto", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    expect(await screen.findByText(/falta el nombre del proyecto/i)).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("crea un proyecto con el nombre y el color por defecto", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Mi proyecto nuevo");
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Mi proyecto nuevo",
        color: "amarillo",
        icon: null,
        description: null,
        parent_id: null,
      }),
    );
  });

  it("crea el proyecto con el color elegido en la paleta", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Con otro color");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Verde" }));
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ color: "verde" }));
  });

  it("rechaza un color personalizado que no da contraste (protege D19/D29) y no crea el proyecto", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Color ilegible");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Personalizado" }));
    await user.type(
      screen.getByLabelText("Código hexadecimal del color personalizado"),
      "#FFFFFF",
    );
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    expect(await screen.findByText(/no se lee bien contra el fondo/i)).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("acepta un color personalizado que sí da contraste", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Color legible");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Personalizado" }));
    await user.type(
      screen.getByLabelText("Código hexadecimal del color personalizado"),
      "#6366F1",
    );
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ color: "#6366F1" }));
  });

  it("marca el proyecto como favorito desde el alta", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Proyecto favorito");
    await user.click(screen.getByRole("checkbox", { name: "Marcar como favorito" }));
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ is_favorite: true }));
  });

  it("no ofrece como padre un proyecto que ya está en el tercer nivel (evita un cuarto)", async () => {
    const user = userEvent.setup();
    const root: ProjectRow = { ...existingProject, id: "root", name: "Raíz", parent_id: null };
    const child: ProjectRow = { ...existingProject, id: "child", name: "Hijo", parent_id: "root" };
    const grandchild: ProjectRow = {
      ...existingProject,
      id: "grandchild",
      name: "Nieto",
      parent_id: "child",
    };
    renderDialog({ allProjects: [root, child, grandchild] });

    await user.click(screen.getByRole("button", { name: "Proyecto padre" }));
    const listbox = await screen.findByRole("listbox");

    expect(within(listbox).getByRole("option", { name: "Sin padre" })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: "Raíz" })).toBeInTheDocument();
    // "Hijo" ya está en el segundo nivel: anidar algo debajo lo dejaría en el
    // tercero, todavía válido. "Nieto" ya está en el tercero: anidar algo
    // debajo lo dejaría en un cuarto nivel, que el trigger de la base
    // rechaza. No tiene que ofrecerse como destino.
    expect(within(listbox).getByRole("option", { name: "Hijo" })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: "Nieto" })).not.toBeInTheDocument();
  });

  it("crea el proyecto como subproyecto cuando se pasa parentId", async () => {
    const user = userEvent.setup();
    renderDialog({ parentId: "parent-1" });

    await user.type(screen.getByLabelText("Nombre"), "Subproyecto");
    await user.click(screen.getByRole("button", { name: "Crear proyecto" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ parent_id: "parent-1" }));
  });

  it("precarga los campos existentes y guarda los cambios al editar", async () => {
    const user = userEvent.setup();
    renderDialog({ project: existingProject });

    const nameInput = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(nameInput.value).toBe("Trabajo");

    await user.clear(nameInput);
    await user.type(nameInput, "Trabajo renombrado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "Trabajo renombrado" }));
    expect(eq).toHaveBeenCalledWith("id", "project-1");
  });
});
