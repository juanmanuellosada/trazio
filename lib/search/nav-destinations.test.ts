import { describe, expect, it } from "vitest";
import { filterNavDestinations } from "./nav-destinations";

/**
 * `filtros-alcanzables`: Filtros faltaba en el grupo "Ir a" del buscador
 * (`search-command.tsx`), la segunda puerta a la pantalla de filtros además
 * del panel lateral — se sumó al implementar, no estaba en el Impact
 * original de la propuesta (ver proposal.md). Mismo orden relativo que en
 * `sidebar-content.tsx`: entre Etiquetas y Hábitos.
 */
describe("filterNavDestinations — Filtros", () => {
  it("aparece en la paleta sin término de búsqueda, entre Etiquetas y Hábitos, con destino /filtros", () => {
    const all = filterNavDestinations("");
    const labels = all.map((d) => d.label);

    expect(labels).toContain("Filtros");
    expect(labels.indexOf("Etiquetas")).toBeLessThan(labels.indexOf("Filtros"));
    expect(labels.indexOf("Filtros")).toBeLessThan(labels.indexOf("Hábitos"));

    const filtros = all.find((d) => d.label === "Filtros")!;
    expect(filtros.href).toBe("/filtros");
  });

  it("se filtra al escribir su nombre", () => {
    const result = filterNavDestinations("filt");
    expect(result.map((d) => d.label)).toEqual(["Filtros"]);
  });
});
