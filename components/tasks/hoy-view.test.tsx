// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import { ComposeContextProvider } from "./compose-context";
import { HoyView } from "./hoy-view";

/**
 * Test del centrado (bloque 9, D39 / design-system.md §5.1): la columna de
 * contenido lleva `mx-auto` junto a `max-w-content`, que centra siempre que
 * sobra espacio y llena el ancho por debajo del máximo, sin condición de
 * container query.
 */

vi.mock("@/lib/tasks/use-hoy-tasks", () => ({
  useHoyTasks: () => ({ data: [] }),
}));

// El bloque de hábitos (fase 3, tarea 4.1) también usa TanStack Query
// (`useHabits`), ajeno al propósito de este test — mismo criterio que
// `useHoyTasks` arriba.
vi.mock("@/lib/habits/use-habits", () => ({
  useHabits: () => ({ data: [] }),
}));

// Overrides de hoy (tarea 4.1, hora efectiva de un hábito reprogramado):
// mismo criterio que `useHabits` arriba, sin `QueryClientProvider` ni
// cliente de Supabase real en este test.
vi.mock("@/lib/habits/schedule-overrides", () => ({
  useHabitScheduleOverridesForDate: () => ({ data: {} }),
}));

// La barra de opciones de vista (bloque 6.5) necesita `QueryClientProvider`
// y un cliente de Supabase real (usa TanStack Query y `useLabels`), ajenos
// al propósito de este test — se reemplaza por un stub, igual que se
// mockea `useHoyTasks` arriba.
vi.mock("@/components/view-options/view-options-bar", () => ({
  ViewOptionsBar: () => null,
}));

// `useViewOptions` también corre TanStack Query; sin mock, `HoyView` se
// queda esperando un `QueryClientProvider` que este test no monta.
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: (_viewKey: string, initialOptions: unknown) => ({ options: initialOptions }),
}));

// El bloque de eventos de hoy (bloque 7.8) también corre TanStack Query
// (`useTodayEvents`), ajeno al propósito de este test — mismo criterio que
// `useHabits` arriba.
vi.mock("@/lib/calendar/use-today-events", () => ({
  useTodayEvents: () => ({ data: { status: "ok", events: [] }, isPending: false, isError: false }),
}));

describe("HoyView — centrado", () => {
  it("aplica mx-auto junto con max-w-content al encabezado y al contenido", () => {
    const { container } = render(
      <ComposeContextProvider>
        <HoyView
          userId="user-1"
          timezone="America/Argentina/Buenos_Aires"
          inboxProjectId={null}
          initialTasks={[]}
          initialHabits={[]}
          nowIso="2026-07-29T12:00:00.000Z"
          todayDate="2026-07-29"
          initialOptions={defaultOptionsForViewKey("hoy")}
        />
      </ComposeContextProvider>,
    );

    const contentDivs = container.querySelectorAll(".max-w-content");
    expect(contentDivs).toHaveLength(2);
    contentDivs.forEach((div) => {
      expect(div).toHaveClass("max-w-content", "mx-auto");
    });
  });
});
