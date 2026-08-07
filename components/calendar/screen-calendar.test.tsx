// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { ScreenCalendar } from "./screen-calendar";

// Tarea 5.7/7.11: `previewBlocks` se arma solo cuando
// `options.showFutureRecurrences` está activada, y solo para tareas que
// tienen `recurrence_rule` (leído aparte con `useRecurringTaskFields`, ya
// que `TaskRow` no lo trae). Test de integración liviano: las piezas
// finas (RRULE, límites de fecha/cantidad) ya están cubiertas en
// `lib/recurrence/expand-range.test.ts` y `lib/calendar/screen-blocks.test.ts`
// — acá solo se verifica el cableado.

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: [] }) }));
vi.mock("@/lib/habits/use-habit-schedule-overrides-range", () => ({ useHabitScheduleOverridesForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/schedule-overrides", () => ({ useSetHabitScheduleOverride: () => ({ mutate: vi.fn() }) }));
vi.mock("@/lib/tasks/mutations", () => ({ useUpdateTask: () => ({ mutate: vi.fn() }), useDeleteTask: () => ({ mutate: vi.fn() }) }));
vi.mock("@/components/tasks/task-detail-context", () => ({ useTaskDetail: () => ({ open: vi.fn(), close: vi.fn() }) }));
vi.mock("@/lib/calendar/use-calendar-range-events", () => ({
  useCalendarRangeEvents: () => ({ data: { status: "ok", events: [] } }),
}));
vi.mock("@/lib/calendar/use-update-event", () => ({ useUpdateEvent: () => ({ mutate: vi.fn() }) }));

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

/** Ancla el reloj un lunes real (`2026-08-03`, mismo ancla que `lib/recurrence/expand-range.test.ts`): `formato_calendario: "semana"` con `weekStartsOn: 1` cubre esa semana entera (lunes a domingo), suficiente para que una regla diaria caiga dentro del rango visible. */
const NOW = new Date("2026-08-03T12:00:00-03:00");

function mockRecurringFieldsResponse(rows: unknown[]) {
  (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockReturnValue({
    from: () => ({
      select: () => ({
        in: () => ({
          not: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "task-recurring",
    project_id: "project-1",
    section_id: null,
    parent_id: null,
    title: "Regar las plantas",
    priority: 2,
    due_date: "2026-08-03",
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    labels: [],
    ...overrides,
  };
}

function renderScreenCalendar(tasks: TaskRow[], showFutureRecurrences: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = {
    ...defaultOptionsForViewKey("bandeja"),
    viewShape: "calendario" as const,
    formato_calendario: "semana" as const,
    showFutureRecurrences,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <ScreenCalendar
        timezone="America/Argentina/Buenos_Aires"
        weekStartsOn={1}
        timeFormat={24}
        options={options}
        tasks={tasks}
        resolveTaskColor={() => "#0284C7"}
        createTaskProjectId="project-1"
      />
    </QueryClientProvider>,
  );
}

describe("ScreenCalendar — bloques de vista previa de repeticiones futuras", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // La tarea real (no vista previa) de por sí ya se dibuja en pantalla
  // (cae el 2026-08-03, dentro del rango visible) con su título como texto
  // visible (`CalendarBlockChip`): por eso el criterio no es "aparece o no"
  // sino "aparece más de una vez" (la propia más N vistas previas) vs.
  // "aparece exactamente una vez" (solo la propia, sin ninguna vista previa
  // agregada). Se cuenta por texto visible (`getAllByText`), no por el
  // atributo `title` nativo (`calendario-mas-info` lo sacó del bloque real,
  // que ahora usa una ficha propia — la vista previa, no interactiva, sigue
  // llevándolo, pero el texto visible es el criterio uniforme para las dos).

  it("con la opción activada, arma al menos una vista previa además del bloque real de la tarea", async () => {
    mockRecurringFieldsResponse([
      { id: "task-recurring", recurrence_rule: "FREQ=DAILY", recurrence_ends_at: null, recurrence_count: null },
    ]);
    renderScreenCalendar([task()], true);

    await screen.findAllByText("Regar las plantas");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getAllByText("Regar las plantas").length).toBeGreaterThan(1);
  });

  it("con la opción desactivada, no agrega ninguna vista previa aunque la tarea tenga regla", async () => {
    mockRecurringFieldsResponse([
      { id: "task-recurring", recurrence_rule: "FREQ=DAILY", recurrence_ends_at: null, recurrence_count: null },
    ]);
    renderScreenCalendar([task()], false);

    await screen.findAllByText("Regar las plantas");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getAllByText("Regar las plantas")).toHaveLength(1);
  });

  it("una tarea sin recurrence_rule no genera ninguna vista previa aunque la opción esté activada", async () => {
    mockRecurringFieldsResponse([]); // la tarea no tiene recurrence_rule: el filtro .not() la deja afuera
    renderScreenCalendar([task()], true);

    await screen.findAllByText("Regar las plantas");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getAllByText("Regar las plantas")).toHaveLength(1);
  });
});
