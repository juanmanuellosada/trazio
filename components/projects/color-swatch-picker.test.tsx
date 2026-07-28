// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ColorSwatchPicker } from "./color-swatch-picker";

function Harness({ error }: { error?: string }) {
  const [value, setValue] = useState("indigo");
  return <ColorSwatchPicker value={value} onChange={setValue} error={error} />;
}

async function goToCustomMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Color" }));
  await user.click(await screen.findByRole("option", { name: "Personalizado" }));
}

describe("ColorSwatchPicker", () => {
  it("pasar a modo personalizado revela la superficie visual y el hexadecimal a mano", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await goToCustomMode(user);

    expect(screen.getByRole("button", { name: "Elegí un color personalizado" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Código hexadecimal del color personalizado" }),
    ).toBeInTheDocument();
  });

  it("elegir un color en la superficie visual actualiza el valor y el campo hexadecimal", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await goToCustomMode(user);
    await user.click(screen.getByRole("button", { name: "Elegí un color personalizado" }));

    const surface = await screen.findByRole("slider", { name: "Saturación y brillo del color" });
    surface.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;

    fireEvent.pointerDown(surface, { clientX: 80, clientY: 20, buttons: 1 });

    const hexInput = screen.getByRole("textbox", {
      name: "Código hexadecimal del color personalizado",
    }) as HTMLInputElement;
    expect(hexInput.value).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("las flechas del teclado sobre el matiz también actualizan el hexadecimal", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await goToCustomMode(user);
    await user.click(screen.getByRole("button", { name: "Elegí un color personalizado" }));

    const hueSlider = await screen.findByRole("slider", { name: "Matiz del color" });
    const hexInput = screen.getByRole("textbox", {
      name: "Código hexadecimal del color personalizado",
    }) as HTMLInputElement;
    const before = hexInput.value;

    hueSlider.focus();
    await user.keyboard("{ArrowRight}");

    expect(hexInput.value).not.toBe(before);
    expect(hexInput.value).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("escribir un hexadecimal a mano sigue funcionando", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await goToCustomMode(user);

    const hexInput = screen.getByRole("textbox", { name: "Código hexadecimal del color personalizado" });
    await user.clear(hexInput);
    await user.type(hexInput, "#123ABC");

    expect(hexInput).toHaveValue("#123ABC");
  });

  it("muestra el mensaje de error cuando se pasa la prop", () => {
    render(<Harness error="Falta elegir un color. Elegí uno de la paleta o un color personalizado." />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Falta elegir un color. Elegí uno de la paleta o un color personalizado.",
    );
  });
});
