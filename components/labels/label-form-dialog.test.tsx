// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { LabelFormDialog } from "./label-form-dialog";
import type { LabelChip } from "@/lib/tasks/use-tasks";

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

function renderDialog(props: Partial<React.ComponentProps<typeof LabelFormDialog>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <LabelFormDialog open onOpenChange={() => {}} {...props} />
    </QueryClientProvider>,
  );
}

const existingLabel: LabelChip = { id: "label-1", name: "Compras", color: "celeste" };

describe("LabelFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    single.mockResolvedValue({ data: { ...existingLabel, id: "new-id" }, error: null });
    eq.mockResolvedValue({ error: null });
  });

  it("muestra un error de validación cuando falta el nombre y no crea la etiqueta", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Crear etiqueta" }));

    expect(await screen.findByText(/falta el nombre de la etiqueta/i)).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("crea una etiqueta con el nombre y el color por defecto", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Urgente");
    await user.click(screen.getByRole("button", { name: "Crear etiqueta" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", name: "Urgente", color: "amarillo" }),
    );
  });

  it("crea la etiqueta con el color elegido en la paleta", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Con otro color");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Verde" }));
    await user.click(screen.getByRole("button", { name: "Crear etiqueta" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ color: "verde" }));
  });

  it("rechaza un color personalizado que no da contraste (protege D19/D29) y no crea la etiqueta", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Ilegible");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Personalizado" }));
    await user.type(screen.getByLabelText("Código hexadecimal del color personalizado"), "#FFFFFF");
    await user.click(screen.getByRole("button", { name: "Crear etiqueta" }));

    expect(await screen.findByText(/no se lee bien contra el fondo/i)).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("acepta un color personalizado que sí da contraste", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Legible");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Personalizado" }));
    await user.type(screen.getByLabelText("Código hexadecimal del color personalizado"), "#6366F1");
    await user.click(screen.getByRole("button", { name: "Crear etiqueta" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ color: "#6366F1" }));
  });

  it("precarga los campos existentes y guarda el renombre y el recoloreo al editar", async () => {
    const user = userEvent.setup();
    renderDialog({ label: existingLabel });

    const nameInput = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(nameInput.value).toBe("Compras");

    await user.clear(nameInput);
    await user.type(nameInput, "Compras urgentes");
    await user.click(screen.getByRole("button", { name: "Color" }));
    await user.click(await screen.findByRole("option", { name: "Verde" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "Compras urgentes", color: "verde" }));
    expect(eq).toHaveBeenCalledWith("id", "label-1");
  });
});
