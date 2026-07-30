import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/parser/dates";
import { nextOccurrence } from "./next";

/**
 * Bloque 5.7: los bordes de verdad de la recurrencia (D-D/D-E). Todas las
 * fechas viajan explícitas como `CalendarDate`, igual que el resto de
 * `lib/parser/dates.ts` — nunca `new Date()` del reloj real.
 */
describe("nextOccurrence", () => {
  it('"cada lunes" vencida tres semanas: agenda el próximo lunes futuro, sin acumular los perdidos', () => {
    // Vencimiento original: lunes 2026-07-06. Se completa recién el
    // miércoles 2026-07-29, con tres lunes ya perdidos en el medio
    // (13, 20 y 27 de julio). D-E: la siguiente instancia es el primer
    // lunes estrictamente posterior a hoy, no el lunes siguiente al
    // vencimiento original.
    const next = nextOccurrence({
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      dueDate: { y: 2026, m: 7, d: 6 },
      now: { y: 2026, m: 7, d: 29 },
    });
    expect(formatDate(next)).toBe("2026-08-03");
  });

  it('"cada 3 días" completada tarde: cuenta desde el completado, no desde el vencimiento', () => {
    // Vencía el 8, se completa el 10 (dos días tarde). La siguiente
    // instancia es tres días después del completado (13), no tres días
    // después del vencimiento original (11).
    const next = nextOccurrence({
      rrule: "FREQ=DAILY;INTERVAL=3",
      dueDate: { y: 2026, m: 7, d: 8 },
      now: { y: 2026, m: 7, d: 10 },
    });
    expect(formatDate(next)).toBe("2026-07-13");
  });

  it('"cada día laborable" completada un sábado: salta el fin de semana, no cae en domingo', () => {
    // Vencía un viernes (2026-07-24), se completa al día siguiente, sábado
    // 2026-07-25. La siguiente instancia es el lunes 2026-07-27, nunca un
    // fin de semana.
    const next = nextOccurrence({
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      dueDate: { y: 2026, m: 7, d: 24 },
      now: { y: 2026, m: 7, d: 25 },
    });
    expect(formatDate(next)).toBe("2026-07-27");
  });

  it("borde de fin de mes: un 31 mensual salta febrero y cae en el próximo mes que tiene 31", () => {
    const next = nextOccurrence({
      rrule: "FREQ=MONTHLY;BYMONTHDAY=31",
      dueDate: { y: 2026, m: 1, d: 31 },
      now: { y: 2026, m: 1, d: 31 },
    });
    expect(formatDate(next)).toBe("2026-03-31");
  });

  it("sin fecha de vencimiento original (intervalo puro sin ancla previa): calcula igual desde el completado", () => {
    const next = nextOccurrence({
      rrule: "FREQ=DAILY;INTERVAL=3",
      dueDate: null,
      now: { y: 2026, m: 7, d: 10 },
    });
    expect(formatDate(next)).toBe("2026-07-13");
  });
});
