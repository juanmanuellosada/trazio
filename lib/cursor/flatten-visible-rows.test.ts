import { describe, expect, it } from "vitest";
import { flattenVisibleRows, type FlattenGroup } from "./flatten-visible-rows";

describe("flattenVisibleRows — orden básico (bloque 2.3)", () => {
  it("aplana varios grupos en orden, sin encabezados", () => {
    const groups: FlattenGroup[] = [
      { rows: [{ id: "a" }, { id: "b" }] },
      { rows: [{ id: "c" }] },
    ];
    expect(flattenVisibleRows(groups)).toEqual(["a", "b", "c"]);
  });

  it("una lista sin grupos da un resultado vacío", () => {
    expect(flattenVisibleRows([])).toEqual([]);
  });
});

describe("flattenVisibleRows — sección colapsada", () => {
  it("una sección colapsada no aporta ningún id", () => {
    const groups: FlattenGroup[] = [
      { rows: [{ id: "a" }, { id: "b" }] },
      { collapsed: true, rows: [{ id: "c" }, { id: "d" }] },
      { rows: [{ id: "e" }] },
    ];
    expect(flattenVisibleRows(groups)).toEqual(["a", "b", "e"]);
  });
});

describe("flattenVisibleRows — subtareas anidadas", () => {
  it("recorre subtareas de más de un nivel en orden", () => {
    const groups: FlattenGroup[] = [
      {
        rows: [
          {
            id: "padre",
            children: [
              { id: "hijo-1", children: [{ id: "nieto-1" }, { id: "nieto-2" }] },
              { id: "hijo-2" },
            ],
          },
          { id: "hermano" },
        ],
      },
    ];
    expect(flattenVisibleRows(groups)).toEqual(["padre", "hijo-1", "nieto-1", "nieto-2", "hijo-2", "hermano"]);
  });

  it("una tarea con subtareas plegadas entra ella misma, pero no sus hijos", () => {
    const groups: FlattenGroup[] = [
      {
        rows: [
          { id: "padre", collapsed: true, children: [{ id: "hijo-1" }, { id: "hijo-2" }] },
          { id: "hermano" },
        ],
      },
    ];
    expect(flattenVisibleRows(groups)).toEqual(["padre", "hermano"]);
  });

  it("plegar un nivel intermedio saltea solo a sus descendientes, no a sus hermanos", () => {
    const groups: FlattenGroup[] = [
      {
        rows: [
          {
            id: "padre",
            children: [
              { id: "hijo-1", collapsed: true, children: [{ id: "nieto-1" }] },
              { id: "hijo-2" },
            ],
          },
        ],
      },
    ];
    expect(flattenVisibleRows(groups)).toEqual(["padre", "hijo-1", "hijo-2"]);
  });
});

describe("flattenVisibleRows — agrupación por prioridad", () => {
  it("respeta el orden de los grupos tal como los arma la pantalla", () => {
    const groups: FlattenGroup[] = [
      { rows: [{ id: "urgente-1" }, { id: "urgente-2" }] },
      { rows: [{ id: "alta-1" }] },
      { rows: [{ id: "media-1" }, { id: "media-2" }] },
    ];
    expect(flattenVisibleRows(groups)).toEqual(["urgente-1", "urgente-2", "alta-1", "media-1", "media-2"]);
  });
});
