// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppDialog } from "./dialog";

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button">Otro botón afuera</button>
      <button
        type="button"
        onClick={() => setOpen(true)}
      >
        Abrir diálogo
      </button>
      <AppDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onClose?.();
        }}
        title="Título de prueba"
        description="Descripción de prueba"
      >
        <button type="button">Adentro uno</button>
        <button type="button">Adentro dos</button>
      </AppDialog>
    </div>
  );
}

describe("AppDialog", () => {
  it("se anuncia con rol y título, y solo se monta cuando está abierto", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));

    const dialog = await screen.findByRole("dialog", { name: "Título de prueba" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Descripción de prueba")).toBeInTheDocument();
  });

  it("al abrirse, el foco entra solo al diálogo (primer paso de la trampa de foco)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    const dialog = await screen.findByRole("dialog");

    // Base UI mueve el foco adentro del diálogo apenas se abre, y de ahí en
    // más lo redirige con guardias de foco invisibles cada vez que `Tab`
    // intenta salir — ese redirigido depende de eventos de foco asíncronos
    // que jsdom no reproduce con fidelidad (a diferencia de un navegador
    // real), así que el ciclo completo de `Tab` se confirma a mano en el
    // paso de verificación en navegador, no acá.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("Escape cierra el diálogo y devuelve el foco al botón que lo abrió", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);

    const openButton = screen.getByRole("button", { name: "Abrir diálogo" });
    await user.click(openButton);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
  });
});
