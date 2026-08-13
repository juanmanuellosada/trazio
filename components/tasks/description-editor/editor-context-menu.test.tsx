// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { descriptionEditorExtensions } from "./extensions";
import { EditorContextMenu } from "./editor-context-menu";

const BEFORE = "Probando ";
const HREF = "https://example.com";
const AFTER = " y texto después";

/**
 * A diferencia de `docWithLink` en `task-description-editor.test.tsx`, acá
 * el enlace NO cubre todo el párrafo: hay texto plano antes y después. Así
 * la selección inicial (al montar) cae afuera de la marca `link`, y el
 * caso real —mover el cursor adentro del enlace después del montaje— queda
 * separado del caso degenerado donde ya arranca adentro.
 */
function createEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: descriptionEditorExtensions(),
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: BEFORE },
            { type: "text", text: HREF, marks: [{ type: "link", attrs: { href: HREF } }] },
            { type: "text", text: AFTER },
          ],
        },
      ],
    },
  });
}

/**
 * Mapea un substring del texto plano a la posición de ProseMirror justo
 * antes de él. El primer carácter del párrafo cae en la posición 1, no 0
 * (la 0 es la apertura del párrafo), así que el offset del texto plano se
 * corre en uno.
 */
function posBefore(editor: Editor, needle: string) {
  const offset = editor.state.doc.textContent.indexOf(needle);
  if (offset < 0) throw new Error(`no se encontró "${needle}" en el documento`);
  return offset + 1;
}

describe('EditorContextMenu: "Abrir enlace" sigue la selección actual (abrir-un-enlace-de-la-descripcion)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('con el cursor movido después del montaje a un enlace que no cubre todo el párrafo, ofrece "Abrir enlace" y la ejecuta', async () => {
    const editor = createEditor();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();

    render(
      <EditorContextMenu editor={editor} onOpenLinkDialog={vi.fn()}>
        <div data-testid="trigger">contenido</div>
      </EditorContextMenu>,
    );

    // El montaje deja el cursor en el texto plano inicial, afuera del
    // enlace. Recién acá, con un comando del editor (no un clic simulado:
    // jsdom no resuelve coordenadas a posición del documento), se mueve la
    // selección adentro de la marca `link` — el caso real que rompía
    // cuando `openableLinkHref` se calculaba una sola vez, en el primer
    // render.
    act(() => {
      editor.commands.setTextSelection(posBefore(editor, "example"));
    });

    fireEvent.contextMenu(screen.getByTestId("trigger"));
    await user.click(await screen.findByRole("menuitem", { name: "Abrir enlace" }));

    expect(openSpy).toHaveBeenCalledWith(HREF, "_blank", "noopener,noreferrer");

    editor.destroy();
  });

  it('con el cursor fuera del enlace (después de moverlo tras el montaje), no ofrece "Abrir enlace"', async () => {
    const editor = createEditor();

    render(
      <EditorContextMenu editor={editor} onOpenLinkDialog={vi.fn()}>
        <div data-testid="trigger">contenido</div>
      </EditorContextMenu>,
    );

    act(() => {
      editor.commands.setTextSelection(posBefore(editor, "texto"));
    });

    fireEvent.contextMenu(screen.getByTestId("trigger"));
    await screen.findByRole("menu");

    expect(screen.queryByRole("menuitem", { name: "Abrir enlace" })).not.toBeInTheDocument();

    editor.destroy();
  });
});
