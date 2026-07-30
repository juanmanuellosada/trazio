import { describe, expect, it } from "vitest";
import { deriveAnchor } from "./anchor";

describe("deriveAnchor (D-D)", () => {
  it("BYDAY ancla en el vencimiento (\"cada lunes\")", () => {
    expect(deriveAnchor("FREQ=WEEKLY;BYDAY=MO")).toBe("due");
  });

  it("BYDAY con varios días ancla en el vencimiento (\"cada día laborable\")", () => {
    expect(deriveAnchor("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")).toBe("due");
  });

  it("BYMONTHDAY ancla en el vencimiento", () => {
    expect(deriveAnchor("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("due");
  });

  it("BYMONTH ancla en el vencimiento", () => {
    expect(deriveAnchor("FREQ=YEARLY;BYMONTH=3")).toBe("due");
  });

  it("intervalo puro sin BY* ancla en el completado (\"cada 3 días\")", () => {
    expect(deriveAnchor("FREQ=DAILY;INTERVAL=3")).toBe("completion");
  });

  it("FREQ=DAILY sola, sin intervalo explícito, también ancla en el completado", () => {
    expect(deriveAnchor("FREQ=DAILY")).toBe("completion");
  });

  it("FREQ=WEEKLY sin BYDAY (\"cada semana\") ancla en el completado", () => {
    expect(deriveAnchor("FREQ=WEEKLY")).toBe("completion");
  });
});
