import { describe, expect, it } from "vitest";
import { UPCOMING_WINDOW_DEFAULT_DAYS } from "@/lib/tasks/upcoming-filter";
import { defaultOptionsForViewKey, isDragEnabled, parseViewOptions } from "./schema";

describe("defaultOptionsForViewKey (bloque 6.1, D25 y specs/opciones-de-vista)", () => {
  it("Bandeja y Proyecto tienen orden manual por defecto", () => {
    expect(defaultOptionsForViewKey("bandeja").order).toBe("manual");
    expect(defaultOptionsForViewKey("proyecto:abc").order).toBe("manual");
  });

  it("Hoy, Próximos, Etiqueta y Filtro ordenan por fecha por defecto", () => {
    expect(defaultOptionsForViewKey("hoy").order).toBe("fecha");
    expect(defaultOptionsForViewKey("proximos").order).toBe("fecha");
    expect(defaultOptionsForViewKey("etiqueta:abc").order).toBe("fecha");
    expect(defaultOptionsForViewKey("filtro:abc").order).toBe("fecha");
  });

  it("Próximos arranca con la ventana por defecto de 7 días", () => {
    expect(defaultOptionsForViewKey("proximos").daysAhead).toBe(UPCOMING_WINDOW_DEFAULT_DAYS);
  });

  it("ninguna pantalla expone hábitos ni repeticiones futuras por default (bloque 6.4)", () => {
    expect(defaultOptionsForViewKey("bandeja").showFutureRecurrences).toBe(false);
  });
});

describe('parseViewOptions: "una view_key sin fila usa los defaults" (bloque 6.12)', () => {
  it("sin fila (null) devuelve los defaults de esa pantalla", () => {
    expect(parseViewOptions("hoy", null)).toEqual(defaultOptionsForViewKey("hoy"));
    expect(parseViewOptions("bandeja", undefined)).toEqual(defaultOptionsForViewKey("bandeja"));
  });

  it("un jsonb vacío también usa los defaults", () => {
    expect(parseViewOptions("proximos", {})).toEqual(defaultOptionsForViewKey("proximos"));
  });
});

describe("parseViewOptions: clave desconocida se ignora (requirement de specs/opciones-de-vista)", () => {
  it("una clave inválida no rompe el resto de las opciones válidas", () => {
    const result = parseViewOptions("proyecto:1", { formato_calendario: "semana", order: "prioridad" });
    expect(result.order).toBe("prioridad");
    expect(result).not.toHaveProperty("formato_calendario");
  });

  it("un valor de tipo equivocado en un campo conocido cae al default de ese campo, sin tocar el resto", () => {
    const result = parseViewOptions("bandeja", { order: 42, groupBy: "etiqueta" });
    expect(result.order).toBe("manual");
    expect(result.groupBy).toBe("etiqueta");
  });

  it("respeta las opciones guardadas cuando son válidas", () => {
    const result = parseViewOptions("proyecto:casa", {
      order: "nombre",
      groupBy: "prioridad",
      showCompleted: false,
      quickFilters: { priority: 1, labelId: "abc", deadline: "con" },
    });
    expect(result).toEqual({
      viewShape: "lista",
      showCompleted: false,
      daysAhead: UPCOMING_WINDOW_DEFAULT_DAYS,
      order: "nombre",
      groupBy: "prioridad",
      quickFilters: { deadline: "con", priority: 1, labelId: "abc" },
      showHabits: true,
      showFutureRecurrences: false,
    });
  });
});

describe("isDragEnabled (D-I, bloque 6.10)", () => {
  it("habilitado con orden manual y sin agrupación", () => {
    expect(isDragEnabled({ order: "manual", groupBy: "nada" })).toBe(true);
  });

  it("deshabilitado con cualquier otro orden", () => {
    expect(isDragEnabled({ order: "fecha", groupBy: "nada" })).toBe(false);
  });

  it("deshabilitado con agrupación activa, aunque el orden sea manual", () => {
    expect(isDragEnabled({ order: "manual", groupBy: "prioridad" })).toBe(false);
  });
});
