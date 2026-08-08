// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarNav } from "./calendar-nav";

// Tarea 6.1/6.2/6.4: "Hoy" lleva el desplazamiento hasta hoy, anterior y
// siguiente corren la cantidad de días visibles (no cambian cuántos se ven),
// y el `aria-label` de esos dos botones deja claro cuánto corren en cada
// formato — distinto en mes (pagina de mes en mes) del resto (desplazamiento
// continuo).

const TZ = "America/Argentina/Buenos_Aires";
const NOW = new Date("2026-08-05T10:00:00-03:00"); // miércoles

describe("CalendarNav", () => {
  it("'Hoy' navega al día de hoy en la zona del usuario", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <CalendarNav
        format="semana"
        anchorDate="2026-06-01"
        visibleDays={["2026-06-01"]}
        timezone={TZ}
        now={NOW}
        onNavigate={onNavigate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Hoy" }));
    expect(onNavigate).toHaveBeenCalledWith("2026-08-05");
  });

  it("siguiente en semana corre siete días, sin cambiar cuántos se ven (tarea 6.2)", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <CalendarNav
        format="semana"
        anchorDate="2026-08-05"
        visibleDays={["2026-08-05"]}
        timezone={TZ}
        now={NOW}
        onNavigate={onNavigate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Avanzar una semana" }));
    expect(onNavigate).toHaveBeenCalledWith("2026-08-12");
  });

  it("anterior en cuatro días corre cuatro días", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <CalendarNav
        format="cuatro-dias"
        anchorDate="2026-08-05"
        visibleDays={["2026-08-05"]}
        timezone={TZ}
        now={NOW}
        onNavigate={onNavigate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retroceder cuatro días" }));
    expect(onNavigate).toHaveBeenCalledWith("2026-08-01");
  });

  it("en mes, el rótulo de los botones deja claro que siguen paginando de mes en mes (tarea 6.4)", () => {
    render(
      <CalendarNav format="mes" anchorDate="2026-08-05" visibleDays={["2026-08-05"]} timezone={TZ} now={NOW} onNavigate={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Retroceder un mes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avanzar un mes" })).toBeInTheDocument();
  });
});
