// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { NavLink } from "./nav-link";

/**
 * Test de `shortcutHiddenOn` (verificación de la sección 5,
 * `interfaz-descubrible`): en Bandeja, `s` lo gana "Agregar sección"
 * (`sectioned-tasks.tsx`), así que el indicador de Buscar no debe dibujarse
 * ahí — mostrarlo anunciaría un atajo que no dispara de verdad.
 */

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => mockUsePathname() }));

describe("NavLink — shortcutHiddenOn", () => {
  it("no dibuja el indicador en una ruta listada en shortcutHiddenOn", () => {
    mockUsePathname.mockReturnValue("/bandeja");
    render(
      <NavLink
        href="/buscar"
        label="Buscar"
        icon={Search}
        shortcut={{ key: "s" }}
        shortcutHiddenOn={["/bandeja"]}
      />,
    );

    expect(screen.queryByText("S")).not.toBeInTheDocument();
  });

  it("dibuja el indicador en cualquier otra ruta", () => {
    mockUsePathname.mockReturnValue("/hoy");
    render(
      <NavLink
        href="/buscar"
        label="Buscar"
        icon={Search}
        shortcut={{ key: "s" }}
        shortcutHiddenOn={["/bandeja"]}
      />,
    );

    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
