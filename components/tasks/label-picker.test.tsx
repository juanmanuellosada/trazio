// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { LabelPicker } from "./label-picker";
import type { LabelChip } from "@/lib/tasks/use-tasks";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

vi.mock("@/lib/supabase/client", () => {
  const order = vi.fn();
  const selectLabels = vi.fn(() => ({ order }));
  const eqDelete = vi.fn();
  const deleteFn = vi.fn(() => ({ eq: eqDelete }));
  const insert = vi.fn();
  const getSession = vi.fn();
  const from = vi.fn((table: string) =>
    table === "labels" ? { select: selectLabels } : { delete: deleteFn, insert },
  );
  return {
    createClient: () => ({ from, auth: { getSession } }),
    __mock: { from, selectLabels, order, deleteFn, eqDelete, insert, getSession },
  };
});

const { order, eqDelete, insert, getSession } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      selectLabels: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      deleteFn: ReturnType<typeof vi.fn>;
      eqDelete: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

const labels: LabelChip[] = [
  { id: "l1", name: "Compras", color: "celeste" },
  { id: "l2", name: "Urgente", color: "magenta" },
  { id: "l3", name: "Casa", color: "verde" },
];

function renderPicker(props: Partial<React.ComponentProps<typeof LabelPicker>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <LabelPicker taskId="task-1" projectId="project-1" assigned={[]} {...props} />
    </QueryClientProvider>,
  );
}

describe("LabelPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.mockResolvedValue({ data: labels, error: null });
    eqDelete.mockResolvedValue({ error: null });
    insert.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  it("busca y filtra las etiquetas del usuario por nombre", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(await screen.findByRole("button", { name: "Etiquetas de la tarea" }));
    await screen.findByRole("option", { name: "Compras" });

    await user.type(screen.getByPlaceholderText("Buscar etiqueta…"), "urg");

    expect(screen.getByRole("option", { name: "Urgente" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Compras" })).not.toBeInTheDocument();
  });

  it("permite marcar varias etiquetas y guarda reemplazando el conjunto completo (no suma)", async () => {
    const user = userEvent.setup();
    renderPicker({ assigned: [labels[0]] });

    await user.click(await screen.findByRole("button", { name: "Etiquetas de la tarea" }));
    await user.click(await screen.findByRole("option", { name: "Urgente" }));

    await waitFor(() => expect(eqDelete).toHaveBeenCalledWith("task_id", "task-1"));
    expect(insert).toHaveBeenCalledWith([
      { task_id: "task-1", label_id: "l1", user_id: "user-1" },
      { task_id: "task-1", label_id: "l2", user_id: "user-1" },
    ]);
  });

  it("destildar una etiqueta ya asignada la saca del conjunto guardado, en vez de una baja incremental", async () => {
    const user = userEvent.setup();
    renderPicker({ assigned: [labels[0], labels[1]] });

    await user.click(await screen.findByRole("button", { name: "Etiquetas de la tarea" }));
    await user.click(await screen.findByRole("option", { name: "Compras" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith([{ task_id: "task-1", label_id: "l2", user_id: "user-1" }]);
  });

  it("el estado vacío menciona @nombre, no #nombre (los símbolos se invirtieron)", async () => {
    order.mockResolvedValue({ data: [], error: null });
    renderPicker();

    expect(await screen.findByText("@nombre")).toBeInTheDocument();
  });
});
