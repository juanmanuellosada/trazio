// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PrioritySelect } from "./priority-select";

/**
 * Tests del selector de prioridad (bloque 4.7/4.9): las cuatro opciones con
 * su nombre, navegable solo con teclado, y que elegir una la aplica. El
 * color de cada punto sale de `--priority-*` (verificado a mano en el
 * navegador, junto con el resto de la paleta — `docs/design-system.md`).
 */

function Harness() {
  const [value, setValue] = useState(4);
  return <PrioritySelect value={value} onChange={setValue} />;
}

describe("PrioritySelect", () => {
  it("muestra las cuatro prioridades con su nombre al abrirse", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /baja/i }));

    expect(await screen.findByRole("menuitem", { name: "Urgente" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Alta" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Media" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Baja" })).toBeInTheDocument();
  });

  it("es navegable solo con teclado: Enter abre, las flechas mueven, Enter elige", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: /baja/i });
    trigger.focus();
    await user.keyboard("{Enter}");

    await screen.findByRole("menuitem", { name: "Urgente" });
    await user.keyboard("{ArrowDown}{Enter}"); // de Urgente (primera opción resaltada al abrir) a Alta

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alta/i })).toBeInTheDocument();
  });

  it("elegir una prioridad la aplica", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /baja/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Urgente" }));

    expect(screen.getByRole("button", { name: /urgente/i })).toBeInTheDocument();
  });
});
