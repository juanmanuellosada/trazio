// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { DeleteLabelDialog } from "./delete-label-dialog";
import type { LabelChip } from "@/lib/tasks/use-tasks";

vi.mock("@/lib/supabase/client", () => {
  const eqForSelect = vi.fn();
  const select = vi.fn(() => ({ eq: eqForSelect }));
  const eqForDelete = vi.fn();
  const deleteFn = vi.fn(() => ({ eq: eqForDelete }));
  const from = vi.fn(() => ({ select, delete: deleteFn }));
  return {
    createClient: () => ({ from }),
    __mock: { from, select, eqForSelect, delete: deleteFn, eqForDelete },
  };
});

const { select, eqForSelect, eqForDelete } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      eqForSelect: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      eqForDelete: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

const label: LabelChip = { id: "label-1", name: "Compras", color: "celeste" };

function renderDialog(taskCount: number) {
  eqForSelect.mockResolvedValue({ count: taskCount, error: null });
  eqForDelete.mockResolvedValue({ error: null });

  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteLabelDialog open onOpenChange={() => {}} label={label} />
    </QueryClientProvider>,
  );
}

describe("DeleteLabelDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cuenta las tareas que tienen la etiqueta y avisa que se desasigna, no que se elimina", async () => {
    renderDialog(3);

    await waitFor(() => expect(eqForSelect).toHaveBeenCalledWith("label_id", "label-1"));
    expect(select).toHaveBeenCalledWith("task_id", { count: "exact", head: true });

    const description = await screen.findByText(/está asignada a 3 tareas/i);
    expect(description).toHaveTextContent("Se va a quitar de todas ellas.");
    expect(description).not.toHaveTextContent(/se van a eliminar/i);
  });

  it("muestra el singular cuando hay una sola tarea afectada", async () => {
    renderDialog(1);
    expect(await screen.findByText(/está asignada a 1 tarea\. se va a quitar de esa tarea/i)).toBeInTheDocument();
  });

  it("avisa que no está asignada a ninguna tarea cuando el conteo es cero", async () => {
    renderDialog(0);
    expect(await screen.findByText(/no está asignada a ninguna tarea/i)).toBeInTheDocument();
  });

  it("deshabilita confirmar mientras cuenta, y elimina la etiqueta al confirmar", async () => {
    const user = userEvent.setup();
    renderDialog(2);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Eliminar de forma permanente" })).not.toBeDisabled(),
    );

    await user.click(screen.getByRole("button", { name: "Eliminar de forma permanente" }));

    await waitFor(() => expect(eqForDelete).toHaveBeenCalledWith("id", "label-1"));
  });
});
