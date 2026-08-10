// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarDayPreview } from "@/components/marketing/calendar-day-preview";
import {
  CALENDAR_PREVIEW_BLOCKS,
  CALENDAR_PREVIEW_END_HOUR,
  CALENDAR_PREVIEW_START_HOUR,
} from "@/lib/landing/calendar-preview-data";

/**
 * Mismo cálculo que hace el componente (`percentFromMinutes`), reproducido
 * acá para verificar la posición vertical sin acoplar el test a internals
 * del componente.
 */
function expectedTopPercent(startMinutes: number): number {
  const start = CALENDAR_PREVIEW_START_HOUR * 60;
  const total = CALENDAR_PREVIEW_END_HOUR * 60 - start;
  return ((startMinutes - start) / total) * 100;
}

describe("CalendarDayPreview", () => {
  it("renderiza los tres tipos de bloque: tarea, hábito y evento", () => {
    const { container } = render(<CalendarDayPreview />);

    expect(container.querySelectorAll('[data-block-type="task"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-block-type="habit"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-block-type="event"]').length).toBeGreaterThan(0);
  });

  it("ubica cada bloque en la posición vertical que le corresponde según su hora", () => {
    const { container } = render(<CalendarDayPreview />);

    for (const block of CALENDAR_PREVIEW_BLOCKS) {
      const el = container.querySelector<HTMLElement>(`[data-start-minutes="${block.startMinutes}"]`);
      expect(el, `no se encontró el bloque "${block.title}"`).not.toBeNull();
      const renderedTop = Number.parseFloat(el!.style.top);
      expect(renderedTop).toBeCloseTo(expectedTopPercent(block.startMinutes), 5);
    }

    // Un bloque más tarde en el día cae más abajo en la grilla.
    const meditar = container.querySelector<HTMLElement>('[data-start-minutes="480"]'); // 08:00
    const almuerzo = container.querySelector<HTMLElement>('[data-start-minutes="780"]'); // 13:00
    expect(Number.parseFloat(meditar!.style.top)).toBeLessThan(Number.parseFloat(almuerzo!.style.top));
  });

  it("no importa nada de components/calendar/ (bundle de la app fuera de la landing pública)", () => {
    const componentSource = readFileSync(
      join("components", "marketing", "calendar-day-preview.tsx"),
      "utf-8",
    );
    const dataSource = readFileSync(join("lib", "landing", "calendar-preview-data.ts"), "utf-8");

    const forbiddenImport = /from\s+["'].*components\/calendar\//;
    expect(forbiddenImport.test(componentSource)).toBe(false);
    expect(forbiddenImport.test(dataSource)).toBe(false);
    // La directiva "use client" (si existiera) va como primera línea no
    // vacía del archivo — no basta con buscar el string en cualquier
    // parte, porque el propio comentario de este componente lo menciona
    // al explicar por qué NO se usa.
    expect(componentSource.trimStart().startsWith('"use client"')).toBe(false);
    expect(dataSource.trimStart().startsWith('"use client"')).toBe(false);
  });
});
