import { describe, expect, it } from "vitest";
import { positionAfterOriginal } from "./tree";
import type { ProjectRow } from "./use-projects";

function project(overrides: Partial<ProjectRow> & { id: string }): ProjectRow {
  return {
    name: "Proyecto",
    color: "celeste",
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    is_example: false,
    position: 1000,
    ...overrides,
  };
}

// A, B, C de primer nivel; D anidado bajo A.
const A = project({ id: "A", position: 1000 });
const B = project({ id: "B", position: 2000 });
const C = project({ id: "C", position: 3000 });
const D = project({ id: "D", parent_id: "A", position: 1000 });
const projects = [A, B, C, D];

describe("positionAfterOriginal (duplicar-un-proyecto)", () => {
  it("ubica la copia justo después del original entre sus hermanos", () => {
    const position = positionAfterOriginal(projects, B);
    expect(position).toBeGreaterThan(B.position);
    expect(position).toBeLessThan(C.position);
  });

  it("cuando el original es el último de su nivel, la copia queda después de todos", () => {
    const position = positionAfterOriginal(projects, C);
    expect(position).toBeGreaterThan(C.position);
  });

  it("un proyecto anidado deja la copia entre sus hermanos del mismo padre, no entre los de primer nivel", () => {
    const position = positionAfterOriginal(projects, D);
    // D es el único hijo de A, así que la copia queda después de todos sus
    // hermanos (solo él mismo) — nunca comparado contra A, B o C.
    expect(position).toBeGreaterThan(D.position);
  });
});
