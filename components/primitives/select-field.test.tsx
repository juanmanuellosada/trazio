// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SelectField } from "./select-field";

const OPTIONS = [
  { value: "a", label: "Opción A" },
  { value: "b", label: "Opción B" },
];

function Harness() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <SelectField
      value={value}
      onChange={setValue}
      options={OPTIONS}
      placeholder="Elegí una opción"
      ariaLabel="Selector de prueba"
    />
  );
}

describe("SelectField", () => {
  it("Enter estando enfocado abre las opciones", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Selector de prueba" });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("las flechas mueven la opción resaltada y Enter la elige", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Selector de prueba" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");

    // cmdk ya resalta la primera opción al abrir: una flecha abajo mueve el
    // resaltado a la segunda, y Enter confirma esa, no la primera.
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Selector de prueba/ })).toHaveTextContent("Opción B");
  });

  it("Espacio estando enfocado también abre las opciones", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Selector de prueba" });
    trigger.focus();
    await user.keyboard(" ");

    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("Escape cierra las opciones sin elegir nada", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: "Selector de prueba" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Selector de prueba/ })).toHaveTextContent("Elegí una opción");
  });
});
