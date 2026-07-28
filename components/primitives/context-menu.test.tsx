// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppContextMenu } from "./context-menu";

function Harness({ onSelectFirst }: { onSelectFirst: () => void }) {
  return (
    <AppContextMenu
      trigger={<div data-testid="target">Clic derecho acá</div>}
      items={[
        { label: "Opción uno", onSelect: onSelectFirst },
        { type: "separator" },
        { label: "Opción dos", onSelect: () => {} },
      ]}
    />
  );
}

function SubmenuHarness({ onSelectNested }: { onSelectNested: () => void }) {
  return (
    <AppContextMenu
      trigger={<div data-testid="target">Clic derecho acá</div>}
      items={[
        {
          type: "submenu",
          label: "Formato",
          items: [{ label: "Negrita", onSelect: onSelectNested }],
        },
      ]}
    />
  );
}

describe("AppContextMenu", () => {
  it("abre con clic derecho y muestra las opciones", async () => {
    render(<Harness onSelectFirst={vi.fn()} />);

    fireEvent.contextMenu(screen.getByTestId("target"));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Opción uno" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Opción dos" })).toBeInTheDocument();
  });

  it("las flechas navegan las opciones y Enter activa la resaltada", async () => {
    const onSelectFirst = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelectFirst={onSelectFirst} />);

    fireEvent.contextMenu(screen.getByTestId("target"));
    await screen.findByRole("menu");

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onSelectFirst).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra el menú sin ejecutar ninguna opción", async () => {
    const onSelectFirst = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelectFirst={onSelectFirst} />);

    fireEvent.contextMenu(screen.getByTestId("target"));
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");

    expect(onSelectFirst).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("un submenú abre con las flechas y activa su opción con Enter (bloque 7, menú del editor)", async () => {
    const onSelectNested = vi.fn();
    const user = userEvent.setup();
    render(<SubmenuHarness onSelectNested={onSelectNested} />);

    fireEvent.contextMenu(screen.getByTestId("target"));
    await screen.findByRole("menu");

    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(await screen.findByRole("menuitem", { name: "Negrita" })).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(onSelectNested).toHaveBeenCalledTimes(1);
  });
});
