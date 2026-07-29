// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmojiPicker } from "./emoji-picker";

// El dataset real de emojibase-data tiene ~1900 entradas: renderizarlo entero
// en jsdom es lo que hacía este test intermitente (pasaba solo, se pasaba del
// timeout bajo la contención de la suite completa). Lo que este componente
// necesita probar (carga al abrir, categorización, y las reglas del filtro
// propio) no depende del volumen real, así que se reemplazan los tres módulos
// que carga `loadEmojiCategories` por un recorte fiel a su forma real: mismos
// campos, mismos índices de grupo, alcanza para ejercitar cada aserción de
// abajo. Lo que este recorte NO cubre es el comportamiento del filtro a
// volumen real (¿sigue siendo rápido con 1900 entradas en un navegador de
// verdad, no en jsdom?) — eso queda para medirlo aparte, no en este test.
// `vi.mock` se hoistea sobre las importaciones (y sobre cualquier `const` del
// scope del módulo), así que el fixture tiene que crearse con `vi.hoisted`
// para poder referenciarlo desde las factories de abajo.
const { FIXTURE_EMOJIS, FIXTURE_MESSAGES, FIXTURE_GROUP_META } = vi.hoisted(() => ({
  FIXTURE_EMOJIS: [
    { unicode: "😀", label: "cara sonriendo", tags: ["cara", "divertido", "feliz", "sonrisa"], hexcode: "1F600", group: 0 },
    { unicode: "❤️", label: "corazón rojo", tags: ["corazón", "emoción", "rojo"], hexcode: "2764", group: 0 },
    {
      unicode: "🧑‍🏭",
      label: "profesional industrial",
      tags: ["fábrica", "montaje", "obrero", "operario", "trabajador"],
      hexcode: "1F9D1-200D-1F3ED",
      group: 1,
    },
    { unicode: "🏠️", label: "casa", tags: ["vivienda"], hexcode: "1F3E0", group: 5 },
    { unicode: "🛖", label: "cabaña", tags: ["casa", "yurta"], hexcode: "1F6D6", group: 5 },
    {
      unicode: "🔽",
      label: "triángulo hacia abajo",
      tags: ["abajo", "botón", "botón triángulo hacia abajo", "triángulo"],
      hexcode: "1F53D",
      group: 8,
    },
  ],
  FIXTURE_MESSAGES: {
    groups: [
      { key: "smileys-emotion", message: "emoticonos y emoción", order: 0 },
      { key: "people-body", message: "personas y cuerpo", order: 1 },
      { key: "travel-places", message: "viajes y lugares", order: 5 },
      { key: "symbols", message: "símbolos", order: 8 },
    ],
  },
  FIXTURE_GROUP_META: {
    groups: { "0": "smileys-emotion", "1": "people-body", "5": "travel-places", "8": "symbols" },
  },
}));

vi.mock("emojibase-data/es/compact.json", () => ({ default: FIXTURE_EMOJIS }));
vi.mock("emojibase-data/es/messages.json", () => ({ default: FIXTURE_MESSAGES }));
vi.mock("emojibase-data/meta/groups.json", () => ({ default: FIXTURE_GROUP_META }));

function Harness() {
  const [value, setValue] = useState<string | undefined>(undefined);
  return <EmojiPicker value={value} onChange={setValue} />;
}

/**
 * Abre el selector y espera la única carga asincrónica real del componente
 * (el efecto que trae las categorías). Con el fixture de arriba ese trabajo
 * es liviano, pero corriendo la suite completa (muchos archivos con su
 * propio jsdom en paralelo) la contención de CPU entre procesos puede hacer
 * que esa espera puntual tarde más que el timeout por default de Testing
 * Library (1000ms) — no porque el componente sea lento, sino por el
 * scheduling del sistema. Por eso el margen extra va acá, en el único punto
 * que depende de esa carga, y no como timeout general del archivo.
 */
async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /ícono/i }));
  return screen.findByText("Emoticonos y emoción", undefined, { timeout: 3000 });
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

    expect(await openPicker(user)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "cara sonriendo" })).toBeInTheDocument();
  });

  it("el buscador encuentra emojis por término de búsqueda en español", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openPicker(user);

    // `fireEvent.change` en vez de `user.type`: alcanza con setear el valor
    // final, no hace falta tipear letra por letra para ejercitar el filtro.
    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "sonrisa" } });

    expect(await screen.findByRole("option", { name: "cara sonriendo" })).toBeInTheDocument();
  });

  it("el buscador encuentra por palabra clave sin relación léxica con el nombre, y no trae ruido del filtro difuso por defecto", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openPicker(user);

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

    await openPicker(user);

    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "corazon" } });

    expect(await screen.findByRole("option", { name: "corazón rojo" })).toBeInTheDocument();
  });

  it("el orden prioriza la coincidencia por nombre por sobre la que es solo por palabra clave", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openPicker(user);

    fireEvent.change(screen.getByPlaceholderText("Buscá un emoji…"), { target: { value: "casa" } });

    // "casa" se llama justo "casa"; "cabaña" solo tiene "casa" como tag.
    await screen.findByRole("option", { name: "casa" });
    const names = screen.getAllByRole("option").map((option) => option.getAttribute("aria-label"));
    expect(names.indexOf("casa")).toBeLessThan(names.indexOf("cabaña"));
  });

  it("elegir un emoji lo pasa a onChange y cierra el selector", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openPicker(user);

    await user.click(screen.getByRole("option", { name: "cara sonriendo" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ícono/i })).toHaveTextContent("😀");
  });
});
