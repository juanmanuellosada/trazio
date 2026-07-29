import { describe, expect, it } from "vitest";
import { buildLabelMenuOptions, buildProjectMenuOptions } from "./menu-options";
import type { ParserLabel, ParserProject } from "./types";

const PROYECTOS: ParserProject[] = [
  {
    id: "p1",
    name: "Trabajo",
    path: "Trabajo",
    sections: [
      { id: "s1", name: "En curso" },
      { id: "s2", name: "Backlog" },
    ],
  },
  { id: "p2", name: "Personal", path: "Personal", sections: [] },
];

const ETIQUETAS: ParserLabel[] = [
  { id: "l1", name: "compras" },
  { id: "l2", name: "urgente" },
];

describe("buildProjectMenuOptions", () => {
  it("sin texto después de #, lista todos los proyectos con sus secciones anidadas debajo", () => {
    const options = buildProjectMenuOptions(PROYECTOS, "");
    expect(options.map((o) => [o.label, o.insertText, o.isSection ?? false])).toEqual([
      ["Trabajo", "Trabajo", false],
      ["En curso", "Trabajo/En curso", true],
      ["Backlog", "Trabajo/Backlog", true],
      ["Personal", "Personal", false],
    ]);
  });

  it("filtra sin distinguir mayúsculas ni acentos, mismo criterio que E7", () => {
    const options = buildProjectMenuOptions(PROYECTOS, "TRAB");
    expect(options.map((o) => o.label)).toEqual(["Trabajo", "En curso", "Backlog"]);
  });

  it("filtra también por el nombre de la sección", () => {
    const options = buildProjectMenuOptions(PROYECTOS, "backlog");
    expect(options.map((o) => o.insertText)).toEqual(["Trabajo/Backlog"]);
  });

  it("sin coincidencias, la lista queda vacía (no ofrece crear: # no crea proyectos)", () => {
    expect(buildProjectMenuOptions(PROYECTOS, "zzz")).toEqual([]);
  });
});

describe("buildLabelMenuOptions", () => {
  it("sin texto después de @, lista todas las etiquetas existentes", () => {
    const options = buildLabelMenuOptions(ETIQUETAS, "");
    expect(options.map((o) => o.label)).toEqual(["compras", "urgente"]);
  });

  it("filtra sin distinguir mayúsculas ni acentos", () => {
    expect(buildLabelMenuOptions(ETIQUETAS, "COMPR").map((o) => o.label)).toEqual(["compras"]);
  });

  it("sin coincidencias, ofrece crear la etiqueta con ese nombre", () => {
    const options = buildLabelMenuOptions(ETIQUETAS, "trab");
    expect(options).toEqual([{ id: "__create__", label: 'Crear etiqueta "trab"', insertText: "trab", isCreate: true }]);
  });

  it("con coincidencias, no ofrece crear (ya coincide con una existente)", () => {
    const options = buildLabelMenuOptions(ETIQUETAS, "compras");
    expect(options.every((o) => !o.isCreate)).toBe(true);
  });
});
