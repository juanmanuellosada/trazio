// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Json } from "@/lib/supabase/database.types";
import { TaskDescriptionEditor } from "./task-description-editor";

function mockClipboard() {
  const readText = vi.fn().mockResolvedValue("");
  Object.defineProperty(navigator, "clipboard", {
    value: { readText },
    configurable: true,
    writable: true,
  });
  return { readText };
}

function docWithText(text: string): Json {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  } as unknown as Json;
}

describe("TaskDescriptionEditor (bloque 7)", () => {
  beforeEach(() => {
    mockClipboard();
  });

  it("el clic derecho abre el menú contextual propio, no el del navegador, con submenús de formato, párrafo e insertar", async () => {
    render(<TaskDescriptionEditor content={null} onChange={vi.fn()} />);

    fireEvent.contextMenu(screen.getByTestId("task-description-editor"));

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Formato/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Párrafo/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Insertar/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Pegar sin formato" })).toBeInTheDocument();
  });

  it("una acción del submenú Formato aplica el formato correspondiente", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TaskDescriptionEditor content={docWithText("Hola")} onChange={onChange} />);

    // Sin selección, `toggleBold` solo cambia la marca "guardada" para lo
    // próximo que se escriba (no toca el documento): para que el resultado
    // se vea en `getJSON()` hace falta seleccionar el texto primero, igual
    // que pide el escenario del spec ("se selecciona texto... y se usa cada
    // opción de la barra"). Foco nativo en vez de `user.click`: un clic
    // simulado le pide a ProseMirror que traduzca coordenadas de puntero a
    // posición del documento (`posAtCoords`, vía `elementFromPoint`), que
    // jsdom no implementa.
    const editorRoot = screen.getByTestId("task-description-editor").querySelector<HTMLElement>("[contenteditable]");
    editorRoot?.focus();
    await user.keyboard("{Control>}a{/Control}");

    fireEvent.contextMenu(screen.getByTestId("task-description-editor"));
    await screen.findByRole("menu");

    // Igual que en `context-menu.test.tsx` (primitiva), un submenú se abre
    // y navega con las flechas: hacerlo con clic de puntero es frágil acá
    // porque Base UI deja `pointer-events: none` en el fondo mientras el
    // popup flotante todavía está posicionándose.
    await user.keyboard("{ArrowDown}{ArrowRight}");
    await screen.findByRole("menuitem", { name: "Negrita" });
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const lastCall = JSON.stringify(onChange.mock.calls.at(-1)?.[0]);
    expect(lastCall).toContain('"type":"bold"');
  });

  it('"pegar sin formato" descarta el formato del portapapeles', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { readText } = mockClipboard();
    readText.mockResolvedValue("texto con **formato**");

    render(<TaskDescriptionEditor content={null} onChange={onChange} />);

    fireEvent.contextMenu(screen.getByTestId("task-description-editor"));
    await screen.findByRole("menu");
    await user.click(screen.getByRole("menuitem", { name: "Pegar sin formato" }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const lastDoc = onChange.mock.calls.at(-1)?.[0];
    expect(JSON.stringify(lastDoc)).not.toContain('"marks"');
    expect(JSON.stringify(lastDoc)).toContain("texto con **formato**");
  });

  it("insertar un enlace no dispara window.prompt: usa el diálogo propio", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockImplementation(() => {
      throw new Error("window.prompt no debería llamarse nunca");
    });

    render(<TaskDescriptionEditor content={docWithText("Visitá")} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Enlace" }));

    const dialog = await screen.findByRole("dialog", { name: "Insertar enlace" });
    expect(dialog).toBeInTheDocument();
    expect(promptSpy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("URL"), "trazio.com.ar");
    await user.click(screen.getByRole("button", { name: "Insertar" }));

    expect(promptSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const lastDoc = JSON.stringify(onChange.mock.calls.at(-1)?.[0]);
    expect(lastDoc).toContain('"href":"https://trazio.com.ar"');

    promptSpy.mockRestore();
  });

  it("cambiar la prop `content` después de montado no pisa lo ya renderizado (invariante del autoguardado, bloque 7.10)", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TaskDescriptionEditor content={docWithText("Texto original en edición")} onChange={onChange} />,
    );

    expect(screen.getByText("Texto original en edición")).toBeInTheDocument();

    // Simula una actualización de query/Realtime que le pasa un `content`
    // distinto al mismo componente montado, sin remontar por `key` (eso lo
    // maneja `task-detail-content.tsx` remontando por tarea, no acá): como
    // `useEditor` crea el editor una sola vez (deps `[]`), el contenido no
    // se re-siembra desde la prop nueva.
    rerender(
      <TaskDescriptionEditor content={docWithText("Un texto distinto que llegó del servidor")} onChange={onChange} />,
    );

    expect(screen.getByText("Texto original en edición")).toBeInTheDocument();
    expect(screen.queryByText("Un texto distinto que llegó del servidor")).not.toBeInTheDocument();
  });
});
