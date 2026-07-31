// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { DeleteHabitDialog } from "./delete-habit-dialog";
import type { Habit } from "@/lib/habits/habit-columns";

vi.mock("@/lib/supabase/client", () => {
  const eq = vi.fn();
  const deleteFn = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: deleteFn }));
  return {
    createClient: () => ({ from }),
    __mock: { from, delete: deleteFn, eq },
  };
});

const { eq } = (
  supabaseClientModule as unknown as { __mock: { from: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> } }
).__mock;

const habit: Habit = {
  id: "habit-1",
  name: "Meditar",
  icon: "🧘",
  color: "celeste",
  duration_minutes: 15,
  scheduled_time: "07:00",
  frequency_type: "daily",
  times_per_week: null,
  days_of_week: null,
  is_archived: false,
  created_at: "2026-01-01T00:00:00.000Z",
  completed_today: false,
};

function renderDialog() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <DeleteHabitDialog open onOpenChange={() => {}} habit={habit} />
    </QueryClientProvider>,
  );
}

describe("DeleteHabitDialog (tarea 3.10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eq.mockResolvedValue({ error: null });
  });

  it("avisa que se pierde el historial de marcas, a diferencia de archivar", () => {
    renderDialog();
    const description = screen.getByText(/se va a eliminar junto con todo su historial de marcas/i);
    expect(description).toHaveTextContent("A diferencia de archivar");
    expect(description).toHaveTextContent("no se puede deshacer");
  });

  it("elimina el hábito al confirmar", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Eliminar de forma permanente" }));

    await waitFor(() => expect(eq).toHaveBeenCalledWith("id", "habit-1"));
  });
});
