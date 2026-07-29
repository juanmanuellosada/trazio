// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("HoyView — centrado condicional", () => {
  it("aplica @[90rem]:mx-auto junto con max-w-content al encabezado y al contenido", () => {
    const { container } = render(
      <HoyView
        userId="user-1"
        timezone="America/Argentina/Buenos_Aires"
        inboxProjectId={null}
        initialTasks={[]}
        nowIso="2026-07-29T12:00:00.000Z"
        todayDate="2026-07-29"
      />,
    );

    const contentDivs = container.querySelectorAll(".max-w-content");
    expect(contentDivs).toHaveLength(2);
    contentDivs.forEach((div) => {
      expect(div).toHaveClass("max-w-content", "@[90rem]:mx-auto");
    });
  });
});
