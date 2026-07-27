// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

function Harness({
  onConfirm,
  destructive = false,
}: {
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Eliminar
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar el elemento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar de forma permanente"
        destructive={destructive}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    </div>
  );
}

describe("ConfirmDialog", () => {
  it("no ejecuta la acción hasta que se confirma", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await screen.findByRole("alertdialog");

    await user.click(screen.getByRole("button", { name: "Eliminar de forma permanente" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancelar cierra sin ejecutar la acción", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await screen.findByRole("alertdialog");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("Escape cierra la confirmación sin ejecutar la acción", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await screen.findByRole("alertdialog");

    await user.keyboard("{Escape}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
