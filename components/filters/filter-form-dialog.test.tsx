// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { FilterFormDialog } from "./filter-form-dialog";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

vi.mock("@/lib/supabase/client", () => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const from = vi.fn(() => ({ insert }));
  const getSession = vi.fn();
  return {
    createClient: () => ({ from, rpc, auth: { getSession } }),
    __mock: { from, insert, select, single, rpc, getSession },
  };
});

const { insert, single, rpc, getSession } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      rpc: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

function renderDialog(props: Partial<React.ComponentProps<typeof FilterFormDialog>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <FilterFormDialog open onOpenChange={() => {}} {...props} />
    </QueryClientProvider>,
  );
}

describe("FilterFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    single.mockResolvedValue({ data: { id: "new-id" }, error: null });
    rpc.mockResolvedValue({ count: 3, error: null });
  });

  it("no cierra el diálogo al hacer clic con el mouse en el campo Consulta, y guarda el filtro", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Urgentes");

    const queryField = screen.getByLabelText("Consulta");
    await user.click(queryField);

    // El clic con mouse en "Consulta" no debe cerrar el diálogo.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(queryField).toHaveFocus();

    await user.type(queryField, "priority:1");
    await user.click(screen.getByRole("button", { name: "Crear filtro" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Urgentes", query: "priority:1" }),
    );
  });
});
