import { describe, expect, it } from "vitest";
import { buildRule, parseRule, quickOptionsFor } from "./rule";

describe("parseRule / buildRule (repeticion-configurable, D-B)", () => {
  it("una regla simple: frecuencia e intervalo, sin componentes de calendario", () => {
    expect(parseRule("FREQ=DAILY;INTERVAL=3")).toEqual({
      frequency: "DAILY",
      interval: 3,
      byDay: [],
      byMonthDay: null,
      byMonth: null,
    });
  });

  it("una regla con días de la semana los conserva al parsear", () => {
    expect(parseRule("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toEqual({
      frequency: "WEEKLY",
      interval: 1,
      byDay: ["MO", "WE", "FR"],
      byMonthDay: null,
      byMonth: null,
    });
  });

  it("una regla con día del mes y mes los conserva al parsear", () => {
    expect(parseRule("FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=5")).toEqual({
      frequency: "YEARLY",
      interval: 1,
      byDay: [],
      byMonthDay: 5,
      byMonth: 4,
    });
  });

  it("buildRule reconstruye la misma regla que parseRule leyó (ida y vuelta)", () => {
    const rule = "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE";
    expect(buildRule(parseRule(rule))).toBe(rule);
  });

  it("buildRule ordena BYDAY en orden canónico sin importar el orden de entrada", () => {
    expect(buildRule({ frequency: "WEEKLY", interval: 1, byDay: ["FR", "MO"], byMonthDay: null, byMonth: null })).toBe(
      "FREQ=WEEKLY;BYDAY=MO,FR",
    );
  });

  it("cambiar solo el intervalo, preservando los componentes existentes, no borra BYDAY", () => {
    const components = parseRule("FREQ=WEEKLY;BYDAY=MO");
    const next = buildRule({ ...components, interval: 2 });
    expect(next).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO");
  });
});

describe("quickOptionsFor (D-C, tarea 3.2)", () => {
  it("deriva las cinco opciones de la fecha de la tarea (domingo 5 de abril)", () => {
    const options = quickOptionsFor({ y: 2026, m: 4, d: 5 });
    expect(options.map((o) => o.label)).toEqual([
      "Cada día",
      "Cada semana el domingo",
      "Cada día laborable",
      "Cada mes el 5",
      "Cada año el 5 de abril",
    ]);
    expect(options.find((o) => o.id === "weekly")?.rule).toBe("FREQ=WEEKLY;BYDAY=SU");
    expect(options.find((o) => o.id === "monthly")?.rule).toBe("FREQ=MONTHLY;BYMONTHDAY=5");
    expect(options.find((o) => o.id === "yearly")?.rule).toBe("FREQ=YEARLY;BYMONTHDAY=5;BYMONTH=4");
    expect(options.find((o) => o.id === "workday")?.rule).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
  });

  it("cambia el texto y la regla según la fecha (lunes 12 de octubre)", () => {
    const options = quickOptionsFor({ y: 2026, m: 10, d: 12 });
    expect(options.find((o) => o.id === "weekly")?.label).toBe("Cada semana el lunes");
    expect(options.find((o) => o.id === "monthly")?.label).toBe("Cada mes el 12");
    expect(options.find((o) => o.id === "yearly")?.label).toBe("Cada año el 12 de octubre");
  });
});
