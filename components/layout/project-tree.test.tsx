// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectMark } from "./project-tree";
import type { ProjectRow } from "@/lib/projects/use-projects";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));

// La Bandeja de entrada guarda `color = null` (D27 en docs/decisions.md), no
// un id de `PROJECT_COLORS`. `ProjectMark` solo usa `color`/`icon`, así que
// el resto de los campos no importa para este test.
const inboxProject = {
  color: null,
  icon: null,
  is_inbox: true,
} as unknown as ProjectRow;

describe("ProjectMark", () => {
  it("renderiza el punto de la Bandeja de entrada sin tirar (color = nulo, no id de la paleta)", () => {
    expect(() => render(<ProjectMark project={inboxProject} />)).not.toThrow();
  });

  it("usa la variante oscura accesible del azul de marca en tema oscuro", () => {
    const { container } = render(<ProjectMark project={inboxProject} />);
    const mark = container.querySelector("span");
    expect(mark).toHaveStyle({ backgroundColor: "#8CA3C9" });
  });
});
