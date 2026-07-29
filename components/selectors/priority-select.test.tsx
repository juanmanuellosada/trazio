// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PrioritySelect } from "./priority-select";

/**
 * Tests del selector de prioridad (bloque 4.7/4.9/5.9): las cuatro opciones
 * con su código y su nombre juntos (`P<n> · Nombre`, decisión D33),
 * navegable solo con teclado, y que elegir una la aplica. El color de cada
 * punto sale de `--priority-*` (verificado a mano en el navegador, junto
 * con el resto de la paleta — `docs/design-system.md`).
 */

function Harness() {
  const [value, setValue] = useState(4);
  return <PrioritySelect value={value} onChange={setValue} />;
}

describe("PrioritySelect", () => {
  it("muestra las cuatro prioridades con su código y su nombre al abrirse", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /P4 · Baja/ }));

    expect(await screen.findByRole("menuitem", { name: "P1 · Urgente" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "P2 · Alta" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "P3 · Media" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "P4 · Baja" })).toBeInTheDocument();
  });

  it("es navegable solo con teclado: Enter abre, las flechas mueven, Enter elige", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: /P4 · Baja/ });
    trigger.focus();
    await user.keyboard("{Enter}");

    await screen.findByRole("menuitem", { name: "P1 · Urgente" });
    await user.keyboard("{ArrowDown}{Enter}"); // de Urgente (primera opción resaltada al abrir) a Alta

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /P2 · Alta/ })).toBeInTheDocument();
  });

  it("elegir una prioridad la aplica", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /P4 · Baja/ }));
    await user.click(await screen.findByRole("menuitem", { name: "P1 · Urgente" }));

    expect(screen.getByRole("button", { name: /P1 · Urgente/ })).toBeInTheDocument();
  });
});
