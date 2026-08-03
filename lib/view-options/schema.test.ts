import { describe, expect, it } from "vitest";
import { UPCOMING_WINDOW_DEFAULT_DAYS } from "@/lib/tasks/upcoming-filter";
import {
  GROUP_BY_OPTIONS,
  defaultOptionsForViewKey,
  effectiveListGroupBy,
  effectivePanelGroupBy,
  parseViewOptions,
} from "./schema";

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
    const result = parseViewOptions("proyecto:1", { orden_experimental: "manual-viejo", order: "prioridad" });
    expect(result.order).toBe("prioridad");
    expect(result).not.toHaveProperty("orden_experimental");
  });

  it("formato_calendario ya no es una clave desconocida: fase 4 la vuelve válida (D-E, bloque 7.1/7.2)", () => {
    const result = parseViewOptions("proyecto:1", { formato_calendario: "semana" });
    expect(result.formato_calendario).toBe("semana");
  });

  it("un formato_calendario inválido cae al default de esa clave", () => {
    const result = parseViewOptions("proyecto:1", { formato_calendario: "año" });
    expect(result.formato_calendario).toBe("semana");
  });

  it("un valor de tipo equivocado en un campo conocido cae al default de ese campo, sin tocar el resto", () => {
    const result = parseViewOptions("bandeja", { order: 42, groupBy: "etiqueta" });
    expect(result.order).toBe("manual");
    expect(result.groupBy).toBe("etiqueta");
  });

  it("un valor viejo desconocido en groupBy cae al default 'nada', sin romper el resto (tarea 1.1, panel-con-columnas-por-campo)", () => {
    const result = parseViewOptions("bandeja", { groupBy: "columna-que-ya-no-existe", order: "nombre" });
    expect(result.groupBy).toBe("nada");
    expect(result.order).toBe("nombre");
  });

  it("los valores nuevos de groupBy (sección y fecha) se guardan sin caer al default", () => {
    expect(parseViewOptions("proyecto:1", { groupBy: "seccion" }).groupBy).toBe("seccion");
    expect(parseViewOptions("proximos", { groupBy: "fecha" }).groupBy).toBe("fecha");
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
      formato_calendario: "semana",
    });
  });
});

describe("GROUP_BY_OPTIONS (tarea 1.1, panel-con-columnas-por-campo)", () => {
  it("suma sección y fecha a los valores existentes", () => {
    expect(GROUP_BY_OPTIONS).toEqual(["nada", "seccion", "fecha", "prioridad", "etiqueta"]);
  });
});

describe("effectivePanelGroupBy (D-B: el panel no ofrece etiqueta, sin pisar la preferencia guardada)", () => {
  it("etiqueta se resuelve a nada dentro del panel", () => {
    expect(effectivePanelGroupBy("etiqueta")).toBe("nada");
  });

  it("los demás valores pasan sin cambios", () => {
    expect(effectivePanelGroupBy("nada")).toBe("nada");
    expect(effectivePanelGroupBy("seccion")).toBe("seccion");
    expect(effectivePanelGroupBy("fecha")).toBe("fecha");
    expect(effectivePanelGroupBy("prioridad")).toBe("prioridad");
  });

  it("una preferencia guardada en 'etiqueta' sigue siendo 'etiqueta' al releerla, aunque el panel la trate como 'nada'", () => {
    const stored = parseViewOptions("bandeja", { groupBy: "etiqueta" });
    expect(stored.groupBy).toBe("etiqueta");
    expect(effectivePanelGroupBy(stored.groupBy)).toBe("nada");
    // Releer de nuevo (ej. al volver a la lista) sigue encontrando "etiqueta" intacto.
    expect(parseViewOptions("bandeja", { groupBy: stored.groupBy }).groupBy).toBe("etiqueta");
  });
});

describe("effectiveListGroupBy (espejo de D-B: la lista no ofrece sección ni fecha, sin pisar la preferencia guardada)", () => {
  it("sección y fecha se resuelven a nada dentro de la lista", () => {
    expect(effectiveListGroupBy("seccion")).toBe("nada");
    expect(effectiveListGroupBy("fecha")).toBe("nada");
  });

  it("los demás valores pasan sin cambios", () => {
    expect(effectiveListGroupBy("nada")).toBe("nada");
    expect(effectiveListGroupBy("prioridad")).toBe("prioridad");
    expect(effectiveListGroupBy("etiqueta")).toBe("etiqueta");
  });

  it("una preferencia guardada en 'sección' desde el panel sigue siendo 'sección' al ir y volver entre lista y panel", () => {
    const stored = parseViewOptions("proyecto:1", { groupBy: "seccion" });
    expect(stored.groupBy).toBe("seccion");
    // La lista la trata como "nada"...
    expect(effectiveListGroupBy(stored.groupBy)).toBe("nada");
    // ...pero no la pisa: volver a leerla (ej. al volver al panel) la encuentra intacta.
    const rereadInList = parseViewOptions("proyecto:1", { groupBy: stored.groupBy });
    expect(rereadInList.groupBy).toBe("seccion");
    expect(effectivePanelGroupBy(rereadInList.groupBy)).toBe("seccion");
  });
});
