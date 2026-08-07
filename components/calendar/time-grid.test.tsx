// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeGrid } from "./time-grid";

// Requirement de `calendario-legible-y-manipulable` (grupo 1, tarea 1.1/1.2):
// la línea de la hora actual se resolvía una sola vez al montar y quedaba
// congelada para siempre — el spec ya exigía que se moviera. Acá se prueba
// que avanza sola, sin recargar la pantalla, que es roja (distinta del color
// de marca) y que sigue apareciendo solo en el día de hoy (tarea 1.3/1.4).

const TZ = "America/Argentina/Buenos_Aires";
const TODAY = "2026-08-05";
const OTHER_DAY = "2026-08-06";

function renderGrid(now: Date, visibleDays: string[]) {
  return render(
    <DndContext id="test-time-grid">
      <TimeGrid visibleDays={visibleDays} blocks={[]} timezone={TZ} now={now} />
    </DndContext>,
  );
}

function lineTopPercent(container: HTMLElement): number {
  const dot = container.querySelector(".bg-destructive");
  const line = dot?.parentElement as HTMLElement | null;
  if (!line) throw new Error("no se encontró la línea de la hora actual");
  return Number(line.style.top.replace("%", ""));
}

function renderGridWithDrag(
  props: Partial<{
    dragOrigin: { dateKey: string; startMinutes: number; endMinutes: number } | null;
    dragDestination: { dateKey: string; startMinutes: number; endMinutes: number } | null;
  }>,
) {
  return render(
    <DndContext id="test-time-grid-drag">
      <TimeGrid visibleDays={[TODAY, OTHER_DAY]} blocks={[]} timezone={TZ} now={new Date("2026-08-05T10:00:00-03:00")} {...props} />
    </DndContext>,
  );
}

describe("TimeGrid — línea de la hora actual", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("avanza sola con el tiempo, sin volver a montar el componente", () => {
    const { container } = renderGrid(new Date("2026-08-05T10:00:00-03:00"), [TODAY]);
    const firstTop = lineTopPercent(container);

    act(() => {
      vi.setSystemTime(new Date("2026-08-05T10:05:00-03:00"));
      vi.advanceTimersByTime(60_000);
    });

    expect(lineTopPercent(container)).toBeGreaterThan(firstTop);
  });

  it("es roja (`bg-destructive`/`border-destructive`): no el color de marca ni el de un bloque", () => {
    const { container } = renderGrid(new Date("2026-08-05T10:00:00-03:00"), [TODAY]);
    expect(container.querySelector(".bg-destructive")).toBeInTheDocument();
    expect(container.querySelector(".border-destructive")).toBeInTheDocument();
    expect(container.querySelector(".bg-primary")).not.toBeInTheDocument();
  });

  it("sigue apareciendo solo en el día de hoy", () => {
    const { container } = renderGrid(new Date("2026-08-05T10:00:00-03:00"), [TODAY, OTHER_DAY]);
    expect(container.querySelectorAll(".bg-destructive")).toHaveLength(1);
  });
});

// Reporte "falta la sombra del destino mientras se arrastra": el hueco de
// origen (punteado, neutro) y la sombra de destino (sólida, `info`) tienen
// que convivir sin confundirse, y la de destino se dibuja en la columna del
// día al que apunta `dragDestination`, que puede ser distinta de la de
// `dragOrigin`.
describe("TimeGrid — sombra de destino durante el arrastre", () => {
  it("no dibuja ninguna sombra sin dragOrigin ni dragDestination", () => {
    const { container } = renderGridWithDrag({});
    expect(container.querySelector(".border-info")).not.toBeInTheDocument();
    expect(container.querySelector(".border-muted-foreground\\/50")).not.toBeInTheDocument();
  });

  it("dibuja la sombra de destino en info, en la posición y el día correctos", () => {
    const { container } = renderGridWithDrag({ dragDestination: { dateKey: OTHER_DAY, startMinutes: 12 * 60, endMinutes: 13 * 60 } });
    const shadow = container.querySelector(".border-info") as HTMLElement | null;
    expect(shadow).toBeInTheDocument();
    expect(Number(shadow!.style.top.replace("%", ""))).toBeCloseTo((12 * 60 * 100) / (24 * 60));
    expect(Number(shadow!.style.height.replace("%", ""))).toBeCloseTo((60 * 100) / (24 * 60));
  });

  it("dibuja origen y destino a la vez, en columnas distintas, sin pisarse", () => {
    const { container } = renderGridWithDrag({
      dragOrigin: { dateKey: TODAY, startMinutes: 9 * 60, endMinutes: 10 * 60 },
      dragDestination: { dateKey: OTHER_DAY, startMinutes: 12 * 60, endMinutes: 13 * 60 },
    });
    expect(container.querySelectorAll(".border-info")).toHaveLength(1);
    expect(container.querySelectorAll(".border-muted-foreground\\/50")).toHaveLength(1);
  });

  it("mover la sombra de destino a otra columna no deja rastro en la columna anterior", () => {
    const { container, rerender } = renderGridWithDrag({ dragDestination: { dateKey: TODAY, startMinutes: 9 * 60, endMinutes: 10 * 60 } });
    expect(container.querySelectorAll(".border-info")).toHaveLength(1);

    rerender(
      <DndContext id="test-time-grid-drag">
        <TimeGrid
          visibleDays={[TODAY, OTHER_DAY]}
          blocks={[]}
          timezone={TZ}
          now={new Date("2026-08-05T10:00:00-03:00")}
          dragDestination={{ dateKey: OTHER_DAY, startMinutes: 9 * 60, endMinutes: 10 * 60 }}
        />
      </DndContext>,
    );
    expect(container.querySelectorAll(".border-info")).toHaveLength(1);
  });
});

// Pedido del dueño ("en móvil, en modo calendario no puedo scrollear cómodo
// porque apenas toco me detecta que quiero crear algo. El crear algo tiene
// que ser con doble toque y arrastrar"): un solo toque sobre el fondo vacío
// no debe arrancar la selección para crear un bloque (deja pasar el scroll
// nativo); con mouse y lápiz no cambia nada. La selección visible
// (`.border-primary.border-dashed`) es la señal de que el gesto arrancó.
describe("TimeGrid — crear arrastrando sobre el fondo vacío: un toque no alcanza, dos sí", () => {
  function renderGridForCreate() {
    const onCreateRange = vi.fn();
    const { container } = render(
      <DndContext id="test-time-grid-create">
        <TimeGrid
          visibleDays={[TODAY]}
          blocks={[]}
          timezone={TZ}
          now={new Date("2026-08-05T10:00:00-03:00")}
          onCreateRange={onCreateRange}
        />
      </DndContext>,
    );
    const column = container.querySelector(".relative.border-r.border-border") as HTMLElement;
    return { container, column, onCreateRange };
  }

  function selecting(container: HTMLElement) {
    return container.querySelector(".border-primary.border-dashed");
  }

  it("con mouse, un solo botonazo arranca y soltar dispara onCreateRange (sin cambios)", () => {
    const { container, column, onCreateRange } = renderGridForCreate();
    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 1, pointerType: "mouse" });
    expect(selecting(container)).toBeInTheDocument();

    fireEvent.pointerUp(window, { clientX: 10, clientY: 150, pointerId: 1 });
    expect(onCreateRange).toHaveBeenCalledTimes(1);
  });

  it("en táctil, un solo toque no arranca la selección — deja pasar el scroll", () => {
    const { container, column, onCreateRange } = renderGridForCreate();
    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 1, pointerType: "touch" });
    expect(selecting(container)).not.toBeInTheDocument();

    fireEvent.pointerUp(window, { clientX: 10, clientY: 100, pointerId: 1 });
    expect(onCreateRange).not.toHaveBeenCalled();
  });

  it("en táctil, un segundo toque cerca y a tiempo del primero arranca la selección (doble toque)", () => {
    const { container, column, onCreateRange } = renderGridForCreate();
    // Primer toque: se levanta cerca de donde bajó (es un toque, no un scroll).
    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(window, { clientX: 12, clientY: 102, pointerId: 1 });
    expect(onCreateRange).not.toHaveBeenCalled();

    // Segundo toque, cerca y enseguida: confirma el doble toque.
    fireEvent.pointerDown(column, { clientX: 14, clientY: 105, pointerId: 2, pointerType: "touch" });
    expect(selecting(container)).toBeInTheDocument();

    fireEvent.pointerUp(window, { clientX: 14, clientY: 180, pointerId: 2 });
    expect(onCreateRange).toHaveBeenCalledTimes(1);
  });

  it("en táctil, dos toques lejos entre sí no cuentan como doble toque", () => {
    const { container, column, onCreateRange } = renderGridForCreate();
    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(window, { clientX: 10, clientY: 100, pointerId: 1 });

    // A más de `DOUBLE_TAP_DISTANCE_PX` (40) del primero.
    fireEvent.pointerDown(column, { clientX: 10, clientY: 500, pointerId: 2, pointerType: "touch" });
    expect(selecting(container)).not.toBeInTheDocument();

    fireEvent.pointerUp(window, { clientX: 10, clientY: 500, pointerId: 2 });
    expect(onCreateRange).not.toHaveBeenCalled();
  });

  it("en táctil, dos toques separados por más tiempo del esperado no cuentan como doble toque", async () => {
    const { container, column, onCreateRange } = renderGridForCreate();
    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(window, { clientX: 10, clientY: 100, pointerId: 1 });

    // Más que `DOUBLE_TAP_WINDOW_MS` (400ms) después: tiempo real, no
    // temporizadores simulados — el gesto se mide con `event.timeStamp`.
    await new Promise((resolve) => setTimeout(resolve, 450));

    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 2, pointerType: "touch" });
    expect(selecting(container)).not.toBeInTheDocument();

    fireEvent.pointerUp(window, { clientX: 10, clientY: 100, pointerId: 2 });
    expect(onCreateRange).not.toHaveBeenCalled();
  });

  it("en táctil, si el primer toque se mueve mucho antes de soltar (arranque de scroll), no cuenta para el próximo doble toque", () => {
    const { container, column, onCreateRange } = renderGridForCreate();
    fireEvent.pointerDown(column, { clientX: 10, clientY: 100, pointerId: 1, pointerType: "touch" });
    // Se levanta lejos de donde bajó: fue un scroll, no un toque.
    fireEvent.pointerUp(window, { clientX: 10, clientY: 400, pointerId: 1 });

    fireEvent.pointerDown(column, { clientX: 10, clientY: 105, pointerId: 2, pointerType: "touch" });
    expect(selecting(container)).not.toBeInTheDocument();

    fireEvent.pointerUp(window, { clientX: 10, clientY: 105, pointerId: 2 });
    expect(onCreateRange).not.toHaveBeenCalled();
  });
});
