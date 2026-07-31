// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

// Tarea 3.6, requirement "sin default silencioso": las tres opciones
// existen siempre, ninguna aparece marcada al abrir, y confirmar sin elegir
// una no aplica ningún cambio.

function Wrapper({ action, onConfirm }: { action: "editar" | "eliminar"; onConfirm: (scope: string) => void }) {
  const [open, setOpen] = useState(true);
  return <RecurrenceScopeDialog open={open} onOpenChange={setOpen} action={action} onConfirm={onConfirm} />;
}

describe("RecurrenceScopeDialog", () => {
  it("no muestra ninguna opción marcada al abrir", () => {
    render(<Wrapper action="editar" onConfirm={vi.fn()} />);

    for (const option of screen.getAllByRole("radio")) {
      expect(option).toHaveAttribute("aria-checked", "false");
    }
  });

  it("el botón de confirmar arranca deshabilitado: no se puede confirmar sin elegir", () => {
    render(<Wrapper action="editar" onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });

  it("elegir una opción la marca y habilita confirmar", async () => {
    const user = userEvent.setup();
    render(<Wrapper action="editar" onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /esta y las siguientes/i }));

    expect(screen.getByRole("radio", { name: /esta y las siguientes/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Editar" })).not.toBeDisabled();
  });

  it("confirmar llama a onConfirm con el scope elegido, ni más ni menos opciones que las tres del spec", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Wrapper action="eliminar" onConfirm={onConfirm} />);

    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(3);

    await user.click(options[2]); // "Todas", la tercera de las tres opciones fijas del spec
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(onConfirm).toHaveBeenCalledWith("all");
  });

  it("cada opción explica a qué ocurrencias afecta (requirement: sin default silencioso, con texto claro de alcance)", () => {
    render(<Wrapper action="editar" onConfirm={vi.fn()} />);

    expect(screen.getByText(/solo este evento puntual/i)).toBeInTheDocument();
    expect(screen.getByText(/este evento y todos los que vengan después/i)).toBeInTheDocument();
    expect(screen.getByText(/toda la serie, incluidas las ocurrencias pasadas y futuras/i)).toBeInTheDocument();
  });
});
