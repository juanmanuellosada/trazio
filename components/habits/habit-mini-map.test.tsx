// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HabitMiniMap } from "./habit-mini-map";
import type { MiniMapCell } from "@/lib/habits/habit-history";

const cells: MiniMapCell[] = [
  { date: "2026-07-30", status: "marked" },
  { date: "2026-07-31", status: "unmarked" },
];

describe("HabitMiniMap (tarea 3.5, D-E: solo lectura)", () => {
  it("no renderiza ningún elemento interactivo", () => {
    render(<HabitMiniMap cells={cells} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("cada celda es un <span> decorativo, sin rol interactivo ni manejador propio", () => {
    const { container } = render(<HabitMiniMap cells={cells} />);
    const spans = container.querySelectorAll("span[aria-hidden]");
    expect(spans).toHaveLength(cells.length);
    for (const span of spans) {
      expect(span.tagName).toBe("SPAN");
      expect(span).not.toHaveAttribute("role");
      expect(span).not.toHaveAttribute("tabindex");
    }
  });

  it("resume el mini-mapa en un único aria-label", () => {
    render(<HabitMiniMap cells={cells} />);
    expect(screen.getByRole("img", { name: "Últimos 14 días: 1 de 2 marcados" })).toBeInTheDocument();
  });
});
