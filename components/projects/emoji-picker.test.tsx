// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmojiPicker } from "./emoji-picker";

// El dataset real de emojibase-data (~1900 entradas) hace que renderizar y
// filtrar la lista completa en jsdom (mucho más lento que un navegador real
// para DOM/layout) tarde más que el timeout por default de Vitest.
vi.setConfig({ testTimeout: 30_000 });

function Harness() {
  const [value, setValue] = useState<string | undefined>(undefined);
  return <EmojiPicker value={value} onChange={setValue} />;
}

describe("EmojiPicker", () => {
  it("no carga los datos de emojis hasta que se abre el selector (D31)", () => {
    render(<Harness />);

    // Cerrado: nada del contenido categorizado (que solo existe una vez
    // cargados los datos) está en el documento.
    expect(screen.queryByText("Emoticonos y emoción")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("al abrirse, carga los datos y muestra categorías con emojis", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /ícono/i }));

    expect(await screen.findByText("Emoticonos y emoción")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "cara sonriendo" })).toBeInTheDocument();
  });

  it("el buscador encuentra emojis por término de búsqueda en español", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /ícono/i }));
    await screen.findByText("Emoticonos y emoción");

    // `fireEvent.change` en vez de `user.type`: tipear letra por letra
    // recalcularía el filtro difuso de cmdk sobre las ~1900 entradas siete
    // veces, y en jsdom (mucho más lento que un navegador real para esto)
    // eso alcanza a superar el timeout del test.
    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "sonrisa" } });

    expect(await screen.findByRole("option", { name: "cara sonriendo" })).toBeInTheDocument();
  });

  it("el buscador encuentra por palabra clave sin relación léxica con el nombre, y no trae ruido del filtro difuso por defecto", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /ícono/i }));
    await screen.findByText("Emoticonos y emoción");

    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "trabajo" } });

    // "profesional industrial" no tiene "trabajo" en el nombre, solo la tag
    // "trabajador": encontrarlo depende de comparar por palabra, no de una
    // coincidencia textual exacta.
    expect(await screen.findByRole("option", { name: "profesional industrial" })).toBeInTheDocument();
    // El filtro difuso por defecto de cmdk devolvía triángulos como mejor
    // resultado para "trabajo" (subsecuencia de letras sin relación real).
    expect(screen.queryByRole("option", { name: "triángulo hacia abajo" })).not.toBeInTheDocument();
  });

  it("el buscador encuentra sin tildes, igual que el parser", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /ícono/i }));
    await screen.findByText("Emoticonos y emoción");

    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "corazon" } });

    expect(await screen.findByRole("option", { name: "corazón rojo" })).toBeInTheDocument();
  });

  it("el orden prioriza la coincidencia por nombre por sobre la que es solo por palabra clave", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /ícono/i }));
    await screen.findByText("Emoticonos y emoción");

    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "casa" } });

    // "casa" se llama justo "casa"; "cabaña" solo tiene "casa" como tag.
    await screen.findByRole("option", { name: "casa" });
    const names = screen.getAllByRole("option").map((option) => option.getAttribute("aria-label"));
    expect(names.indexOf("casa")).toBeLessThan(names.indexOf("cabaña"));
  });

  it("elegir un emoji lo pasa a onChange y cierra el selector", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /ícono/i }));
    await screen.findByText("Emoticonos y emoción");

    await user.click(screen.getByRole("option", { name: "cara sonriendo" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ícono/i })).toHaveTextContent("😀");
  });
});
