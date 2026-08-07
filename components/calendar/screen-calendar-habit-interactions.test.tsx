// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import type { Habit } from "@/lib/habits/habit-columns";
import { HOUR_ROW_HEIGHT_PX } from "./grid-metrics";
import { ScreenCalendar } from "./screen-calendar";

/**
 * Dos cambios sobre el bloque de hábito de la grilla (pedido del dueño,
 * `docs/decisions.md` D51): antes `handleSelectBlock` tenía un `return`
 * vacío para hábito (no abría nada) y `draggable-timed-block.tsx` excluía
 * a propósito la manija de redimensionar. Este archivo cubre las dos.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/tasks/mutations", () => ({ useUpdateTask: () => ({ mutate: vi.fn() }), useDeleteTask: () => ({ mutate: vi.fn() }) }));
vi.mock("@/components/tasks/task-detail-context", () => ({ useTaskDetail: () => ({ open: vi.fn(), close: vi.fn() }) }));
vi.mock("@/lib/calendar/use-calendar-range-events", () => ({
  useCalendarRangeEvents: () => ({ data: { status: "ok", events: [] } }),
}));
vi.mock("@/lib/calendar/use-update-event", () => ({ useUpdateEvent: () => ({ mutate: vi.fn() }) }));

vi.mock("@/lib/habits/use-habit-schedule-overrides-range", () => ({ useHabitScheduleOverridesForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/skips", () => ({ useSkipHabit: () => ({ mutate: vi.fn() }), useHabitSkipsForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/completions", () => ({ useHabitCompletionsForRange: () => ({ data: {} }) }));

// `vi.mock` se eleva por encima de las declaraciones `const` del módulo, así
// que los mocks compartidos entre las dos suites (para leer qué mutación se
// llamó) tienen que salir de `vi.hoisted` — no de un `const` suelto acá
// abajo, que dispararía "Cannot access before initialization".
const { setHabitOverrideMutate, updateHabitMutate, toastSuccessMock } = vi.hoisted(() => ({
  setHabitOverrideMutate: vi.fn(),
  updateHabitMutate: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/habits/schedule-overrides", () => ({ useSetHabitScheduleOverride: () => ({ mutate: setHabitOverrideMutate }) }));
vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: vi.fn() }),
  useUnmarkHabitDone: () => ({ mutate: vi.fn() }),
  useUpdateHabit: () => ({ mutate: updateHabitMutate }),
}));
vi.mock("@/lib/toast", () => ({ toastSuccess: toastSuccessMock }));

const HABIT: Habit = {
  id: "habit-1",
  name: "Meditar",
  icon: "🧘",
  color: "azul",
  duration_minutes: 30,
  scheduled_time: "09:00:00",
  frequency_type: "daily",
  times_per_week: null,
  days_of_week: null,
  is_archived: false,
  created_at: "2026-07-01T00:00:00.000Z",
  completed_today: false,
};

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: [HABIT] }) }));

// El diálogo real pide RHF/zod y `useCreateHabit`/`useUpdateHabit` propios,
// ajenos al propósito de este test: se reemplaza por un stub que solo
// expone si está montado y sobre qué hábito — mismo criterio que
// `hoy-event-row.test.tsx` con `EditEventDialog`.
vi.mock("@/components/habits/habit-form-dialog", () => ({
  HabitFormDialog: ({ habit }: { habit?: Habit }) => <div data-testid="habit-form-dialog">{habit?.name ?? "sin hábito"}</div>,
}));

const NOW = new Date("2026-08-05T12:00:00-03:00");

function renderScreenCalendar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = {
    ...defaultOptionsForViewKey("bandeja"),
    viewShape: "calendario" as const,
    formato_calendario: "dia" as const,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <ScreenCalendar
        timezone="America/Argentina/Buenos_Aires"
        weekStartsOn={1}
        timeFormat={24}
        options={options}
        tasks={[]}
        resolveTaskColor={() => "#0284C7"}
        createTaskProjectId="project-1"
      />
    </QueryClientProvider>,
  );
}

describe("ScreenCalendar — seleccionar un bloque de hábito (cambio 1)", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("un clic abre HabitFormDialog con el hábito real, no el id compuesto del bloque", async () => {
    renderScreenCalendar();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Meditar" }));
    // Si `handleSelectBlock` seteara el id compuesto (`habit-1::2026-08-05`)
    // en vez de extraer el real con `parseHabitBlockId`, `habitsById.get`
    // no lo encontraría y el diálogo se abriría sin hábito ("sin hábito").
    expect(await screen.findByTestId("habit-form-dialog")).toHaveTextContent("Meditar");
  });

  it("un doble clic termina con el diálogo de edición abierto, no cerrado", async () => {
    renderScreenCalendar();
    const user = userEvent.setup();
    await user.dblClick(await screen.findByRole("button", { name: "Meditar" }));
    expect(await screen.findByTestId("habit-form-dialog")).toHaveTextContent("Meditar");
  });

  it("el emoji del hábito se ve en el bloque del calendario (se perdía solo al pintar)", async () => {
    renderScreenCalendar();
    expect(await screen.findByText("🧘")).toBeInTheDocument();
  });
});

describe("ScreenCalendar — redimensionar un bloque de hábito (cambio 2)", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    updateHabitMutate.mockClear();
    setHabitOverrideMutate.mockClear();
    toastSuccessMock.mockClear();
  });

  it("estirar la manija escribe duration_minutes en el hábito (global) y avisa con toast, sin tocar el override del día", async () => {
    const { container } = renderScreenCalendar();
    await screen.findByRole("button", { name: "Meditar" });

    const handle = container.querySelector(".cursor-ns-resize");
    expect(handle).not.toBeNull();

    // +24px con `HOUR_ROW_HEIGHT_PX` = 48px/hora equivale a +30 minutos
    // (`pixelsToMinutes`): el hábito pasa de 30 a 60 minutos de duración.
    const startY = 100;
    fireEvent.pointerDown(handle!, { clientY: startY, button: 0 });
    fireEvent.pointerUp(window, { clientY: startY + (30 / 60) * HOUR_ROW_HEIGHT_PX });

    expect(setHabitOverrideMutate).not.toHaveBeenCalled();
    expect(updateHabitMutate).toHaveBeenCalledTimes(1);
    const [variables, mutateOptions] = updateHabitMutate.mock.calls[0]!;
    expect(variables).toEqual({ id: "habit-1", patch: { duration_minutes: 60 } });

    // El toast solo dispara `onSuccess` (mock de la mutación no lo llama
    // solo): confirma que el aviso deja explícito que el cambio es del
    // hábito entero, no de este día puntual.
    mutateOptions.onSuccess();
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    const [message] = toastSuccessMock.mock.calls[0]!;
    expect(message).toContain("Meditar");
    expect(message).toMatch(/todas sus repeticiones|no solo/i);
  });

  it("soltar en el mismo lugar no dispara ninguna mutación (guard de nada cambió)", async () => {
    const { container } = renderScreenCalendar();
    await screen.findByRole("button", { name: "Meditar" });

    const handle = container.querySelector(".cursor-ns-resize");
    const startY = 100;
    fireEvent.pointerDown(handle!, { clientY: startY, button: 0 });
    fireEvent.pointerUp(window, { clientY: startY });

    expect(updateHabitMutate).not.toHaveBeenCalled();
    expect(setHabitOverrideMutate).not.toHaveBeenCalled();
  });
});
