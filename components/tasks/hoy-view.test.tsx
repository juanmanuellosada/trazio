// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import { HoyView } from "./hoy-view";

/**
 * Test del centrado condicional (bloque 9, D35 / design-system.md §5.1): la
 * columna de contenido lleva la variante de container query
 * `@[90rem]:mx-auto` junto a `max-w-content`, que centra por encima del
 * umbral de ancho disponible (90rem/1440px) y deja alineada a la izquierda
 * por debajo. jsdom no evalúa container queries reales (no hay layout), así
 * que esto verifica que la clase esté presente — el comportamiento
 * resultante en distintos anchos se confirma en un navegador real.
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

describe("HoyView — centrado condicional", () => {
  it("aplica @[90rem]:mx-auto junto con max-w-content al encabezado y al contenido", () => {
    const { container } = render(
      <HoyView
        userId="user-1"
        timezone="America/Argentina/Buenos_Aires"
        inboxProjectId={null}
        initialTasks={[]}
        initialHabits={[]}
        nowIso="2026-07-29T12:00:00.000Z"
        todayDate="2026-07-29"
        initialOptions={defaultOptionsForViewKey("hoy")}
      />,
    );

    const contentDivs = container.querySelectorAll(".max-w-content");
    expect(contentDivs).toHaveLength(2);
    contentDivs.forEach((div) => {
      expect(div).toHaveClass("max-w-content", "@[90rem]:mx-auto");
    });
  });
});
