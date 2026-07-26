import { describe, expect, it } from "vitest";
import { PROJECT_COLOR_IDS, PROJECT_COLORS } from "./colors";

describe("PROJECT_COLORS", () => {
  it("tiene los diez colores de la paleta fija", () => {
    expect(PROJECT_COLOR_IDS).toHaveLength(10);
    expect(Object.keys(PROJECT_COLORS)).toHaveLength(10);
  });
});
