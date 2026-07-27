import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  formatDate,
  nextOccurrenceOfMonthDay,
  nextWeekday,
  nextWeekStart,
  today,
  toDueAt,
} from "./dates";
import type { ParserContext, ParserLabel, ParserProject } from "./types";

/**
 * El contrato ejecutable del parser (E14, bloque 9.1): refleja 1 a 1 la
 * tabla de `docs/parser-test-cases.md`, un `CasoParser` por fila numerada
 * (59 filas — la fila 55 trae dos entradas, pero es una sola fila). El
 * `numero` es el de la tabla; si alguien edita la tabla sin tocar este
 * archivo o al revés, `parser.test.ts` lo detecta con el test que cuenta
 * los casos.
 *
 * Las fechas se escriben en relativo, nunca hardcodeadas (así lo pide el
 * propio contrato): cada `esperar` recibe el contexto real de la corrida
 * (con su `ahora`/`zonaHoraria`/`semanaEmpiezaEn`) y calcula el valor
 * esperado con las mismas funciones de calendario que usa el parser — la
 * tabla no está fijando aritmética de fechas de nuevo, está fijando qué
 * categoría le corresponde a cada frase.
 */

export type CasoEsperado = {
  titulo: string;
  dueDate: string | null;
  dueAt: string | null;
  durationMinutes: number | null;
  priority: number | null;
  recurrenceRule: string | null;
  labels: string[];
  project: { name: string; section: string | null } | null;
};

export type CasoParser = {
  numero: number;
  entrada: string | string[];
  /** Solo los casos de símbolos (38-43, 53) necesitan proyectos/etiquetas o un `week_starts_on` distinto del default. */
  contexto?: Partial<Pick<ParserContext, "proyectos" | "etiquetas" | "semanaEmpiezaEn">>;
  esperar: (ctx: ParserContext) => CasoEsperado;
};

const SIN_ATRIBUTOS: Omit<CasoEsperado, "titulo"> = {
  dueDate: null,
  dueAt: null,
  durationMinutes: null,
  priority: null,
  recurrenceRule: null,
  labels: [],
  project: null,
};

function hoyDe(ctx: ParserContext) {
  return today(ctx.ahora, ctx.zonaHoraria);
}

function conFecha(titulo: string, dueDate: ReturnType<typeof today>): CasoEsperado {
  return { titulo, ...SIN_ATRIBUTOS, dueDate: formatDate(dueDate) };
}

function conHora(ctx: ParserContext, titulo: string, dueDate: ReturnType<typeof today>, hour: number, minute = 0): CasoEsperado {
  return { titulo, ...SIN_ATRIBUTOS, dueAt: toDueAt(dueDate, hour, minute, ctx.zonaHoraria) };
}

const PROYECTO_TRABAJO: ParserProject = {
  id: "proj-trabajo",
  name: "Trabajo",
  path: "Trabajo",
  sections: [{ id: "sec-en-curso", name: "En curso" }],
};
const PROYECTO_PROYECTOS: ParserProject = { id: "proj-proyectos", name: "Proyectos", path: "Proyectos", sections: [] };
const ETIQUETAS_VACIAS: ParserLabel[] = [];

export const casos: CasoParser[] = [
  // Fechas relativas (1-11)
  { numero: 1, entrada: "Llamar a mamá hoy", esperar: (ctx) => conFecha("Llamar a mamá", hoyDe(ctx)) },
  { numero: 2, entrada: "Comprar pan mañana", esperar: (ctx) => conFecha("Comprar pan", addDays(hoyDe(ctx), 1)) },
  {
    numero: 3,
    entrada: "Turno médico pasado mañana",
    esperar: (ctx) => conFecha("Turno médico", addDays(hoyDe(ctx), 2)),
  },
  { numero: 4, entrada: "Revisar notas ayer", esperar: (ctx) => conFecha("Revisar notas", addDays(hoyDe(ctx), -1)) },
  {
    numero: 5,
    entrada: "Limpiar el garage este fin de semana",
    esperar: (ctx) => {
      const hoy = hoyDe(ctx);
      const dow = new Date(Date.UTC(hoy.y, hoy.m - 1, hoy.d)).getUTCDay();
      const esFinDeSemana = dow === 0 || dow === 6;
      return conFecha("Limpiar el garage", esFinDeSemana ? hoy : nextWeekday(hoy, 6, false));
    },
  },
  {
    numero: 6,
    entrada: "Enviar informe próxima semana",
    esperar: (ctx) => conFecha("Enviar informe", nextWeekStart(hoyDe(ctx), ctx.semanaEmpiezaEn)),
  },
  {
    numero: 7,
    entrada: "Reunión próximo lunes",
    esperar: (ctx) => conFecha("Reunión", nextWeekday(hoyDe(ctx), 1, false)),
  },
  {
    numero: 8,
    entrada: "Renovar seguro en 3 días",
    esperar: (ctx) => conFecha("Renovar seguro", addDays(hoyDe(ctx), 3)),
  },
  {
    numero: 9,
    entrada: "Vacaciones en 2 semanas",
    esperar: (ctx) => conFecha("Vacaciones", addDays(hoyDe(ctx), 14)),
  },
  { numero: 10, entrada: "Control en 6 meses", esperar: (ctx) => conFecha("Control", addMonths(hoyDe(ctx), 6)) },
  {
    numero: 11,
    entrada: "Renovar pasaporte en 1 año",
    esperar: (ctx) => conFecha("Renovar pasaporte", addYears(hoyDe(ctx), 1)),
  },

  // Fechas puntuales (12-18)
  {
    numero: 12,
    entrada: "Cumpleaños de Ana 15 de marzo",
    esperar: (ctx) => conFecha("Cumpleaños de Ana", nextOccurrenceOfMonthDay(hoyDe(ctx), 3, 15)),
  },
  {
    numero: 13,
    entrada: "Pagar patente 15 de mar",
    esperar: (ctx) => conFecha("Pagar patente", nextOccurrenceOfMonthDay(hoyDe(ctx), 3, 15)),
  },
  {
    numero: 14,
    entrada: "Vence el 15 de marzo de 2027",
    esperar: () => conFecha("Vence el", { y: 2027, m: 3, d: 15 }),
  },
  {
    numero: 15,
    entrada: "Entrega 15/03",
    esperar: (ctx) => conFecha("Entrega", nextOccurrenceOfMonthDay(hoyDe(ctx), 3, 15)),
  },
  { numero: 16, entrada: "Entrega 15/03/2027", esperar: () => conFecha("Entrega", { y: 2027, m: 3, d: 15 }) },
  { numero: 17, entrada: "Entrega 15-03-27", esperar: () => conFecha("Entrega", { y: 2027, m: 3, d: 15 }) },
  {
    numero: 18,
    entrada: "Reunión 05/06",
    esperar: (ctx) => conFecha("Reunión", nextOccurrenceOfMonthDay(hoyDe(ctx), 6, 5)),
  },

  // Día de la semana suelto (19-21)
  { numero: 19, entrada: "Reunión lunes", esperar: (ctx) => conFecha("Reunión", nextWeekday(hoyDe(ctx), 1, false)) },
  {
    numero: 20,
    entrada: "Gimnasio viernes",
    esperar: (ctx) => conFecha("Gimnasio", nextWeekday(hoyDe(ctx), 5, false)),
  },
  {
    numero: 21,
    entrada: "Reunión el 20/08 con el equipo del lunes",
    esperar: (ctx) =>
      conFecha("Reunión el con el equipo del lunes", nextOccurrenceOfMonthDay(hoyDe(ctx), 8, 20)),
  },

  // Horas (22-27)
  {
    numero: 22,
    entrada: "Llamar al banco a las 14:30",
    esperar: (ctx) => conHora(ctx, "Llamar al banco", hoyDe(ctx), 14, 30),
  },
  { numero: 23, entrada: "Dentista 3pm", esperar: (ctx) => conHora(ctx, "Dentista", hoyDe(ctx), 15) },
  { numero: 24, entrada: "Desayuno 9am", esperar: (ctx) => conHora(ctx, "Desayuno", hoyDe(ctx), 9) },
  { numero: 25, entrada: "Reunión a las 3", esperar: (ctx) => conHora(ctx, "Reunión", hoyDe(ctx), 15) },
  { numero: 26, entrada: "Reunión a las 9", esperar: (ctx) => conHora(ctx, "Reunión", hoyDe(ctx), 9) },
  {
    numero: 27,
    entrada: "Llamar mañana a las 10",
    esperar: (ctx) => conHora(ctx, "Llamar", addDays(hoyDe(ctx), 1), 10),
  },

  // Duraciones (28-30)
  { numero: 28, entrada: "Correr 1h30m", esperar: () => ({ titulo: "Correr", ...SIN_ATRIBUTOS, durationMinutes: 90 }) },
  {
    numero: 29,
    entrada: "Meditar por 45min",
    esperar: () => ({ titulo: "Meditar", ...SIN_ATRIBUTOS, durationMinutes: 45 }),
  },
  {
    numero: 30,
    entrada: "Estudiar 2 horas",
    esperar: () => ({ titulo: "Estudiar", ...SIN_ATRIBUTOS, durationMinutes: 120 }),
  },

  // Repetición (31-37)
  {
    numero: 31,
    entrada: "Regar plantas cada día",
    esperar: () => ({ titulo: "Regar plantas", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=DAILY" }),
  },
  {
    numero: 32,
    entrada: "Sacar la basura cada semana",
    esperar: () => ({ titulo: "Sacar la basura", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=WEEKLY" }),
  },
  {
    numero: 33,
    entrada: "Pagar alquiler cada mes",
    esperar: () => ({ titulo: "Pagar alquiler", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=MONTHLY" }),
  },
  {
    numero: 34,
    entrada: "Renovar dominio cada año",
    esperar: () => ({ titulo: "Renovar dominio", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=YEARLY" }),
  },
  {
    numero: 35,
    entrada: "Reunión de equipo cada 2 semanas",
    esperar: () => ({ titulo: "Reunión de equipo", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=WEEKLY;INTERVAL=2" }),
  },
  {
    numero: 36,
    entrada: "Gimnasio cada lunes",
    esperar: () => ({ titulo: "Gimnasio", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=WEEKLY;BYDAY=MO" }),
  },
  {
    numero: 37,
    entrada: "Revisar mails cada día laborable",
    esperar: () => ({
      titulo: "Revisar mails",
      ...SIN_ATRIBUTOS,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    }),
  },

  // Símbolos (38-43)
  {
    numero: 38,
    entrada: "Llamar al contador p1",
    esperar: () => ({ titulo: "Llamar al contador", ...SIN_ATRIBUTOS, priority: 1 }),
  },
  {
    numero: 39,
    entrada: "Ordenar el placard p4",
    esperar: () => ({ titulo: "Ordenar el placard", ...SIN_ATRIBUTOS, priority: 4 }),
  },
  {
    numero: 40,
    entrada: "Comprar leche #compras",
    contexto: { etiquetas: ETIQUETAS_VACIAS },
    esperar: () => ({ titulo: "Comprar leche", ...SIN_ATRIBUTOS, labels: ["compras"] }),
  },
  {
    numero: 41,
    entrada: "Terminar informe @Trabajo",
    contexto: { proyectos: [PROYECTO_TRABAJO] },
    esperar: () => ({
      titulo: "Terminar informe",
      ...SIN_ATRIBUTOS,
      project: { name: "Trabajo", section: null },
    }),
  },
  {
    numero: 42,
    entrada: "Revisar diseño @Trabajo/En curso",
    contexto: { proyectos: [PROYECTO_TRABAJO] },
    esperar: () => ({
      titulo: "Revisar diseño",
      ...SIN_ATRIBUTOS,
      project: { name: "Trabajo", section: "En curso" },
    }),
  },
  {
    numero: 43,
    entrada: "Comprar regalo #compras #urgente",
    contexto: { etiquetas: ETIQUETAS_VACIAS },
    esperar: () => ({ titulo: "Comprar regalo", ...SIN_ATRIBUTOS, labels: ["compras", "urgente"] }),
  },

  // Casos críticos (44-52)
  {
    numero: 44,
    entrada: "Salir a correr a la mañana",
    esperar: () => ({ titulo: "Salir a correr a la mañana", ...SIN_ATRIBUTOS }),
  },
  { numero: 45, entrada: "Reunión esta mañana", esperar: (ctx) => conFecha("Reunión", hoyDe(ctx)) },
  {
    numero: 46,
    entrada: "Terminar el informe de la mañana",
    esperar: () => ({ titulo: "Terminar el informe de la mañana", ...SIN_ATRIBUTOS }),
  },
  { numero: 47, entrada: "Comprar 3 manzanas", esperar: () => ({ titulo: "Comprar 3 manzanas", ...SIN_ATRIBUTOS }) },
  {
    numero: 48,
    entrada: "Llamar al 4567-8900",
    esperar: () => ({ titulo: "Llamar al 4567-8900", ...SIN_ATRIBUTOS }),
  },
  {
    numero: 49,
    entrada: "Revisar objetivos Q1 2027",
    esperar: () => ({ titulo: "Revisar objetivos Q1 2027", ...SIN_ATRIBUTOS }),
  },
  {
    numero: 50,
    entrada: "Preparar la reunión de mañana",
    esperar: (ctx) => conFecha("Preparar la reunión", addDays(hoyDe(ctx), 1)),
  },
  { numero: 51, entrada: "Comprar pan", esperar: () => ({ titulo: "Comprar pan", ...SIN_ATRIBUTOS }) },
  {
    numero: 52,
    entrada: "Pagar el alquiler el 1",
    esperar: () => ({ titulo: "Pagar el alquiler el 1", ...SIN_ATRIBUTOS }),
  },

  // El caso completo (53)
  {
    numero: 53,
    entrada: "Reunión con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Proyectos",
    contexto: { proyectos: [PROYECTO_PROYECTOS], etiquetas: ETIQUETAS_VACIAS },
    esperar: (ctx) => ({
      titulo: "Reunión con Ana",
      dueDate: null,
      dueAt: toDueAt(nextWeekday(hoyDe(ctx), 2, false), 15, 0, ctx.zonaHoraria),
      durationMinutes: 45,
      priority: 2,
      recurrenceRule: null,
      labels: ["trabajo"],
      project: { name: "Proyectos", section: null },
    }),
  },

  // Incorporaciones posteriores (54-56)
  {
    numero: 54,
    entrada: "Gimnasio cada lunes a las 8",
    esperar: (ctx) => ({
      titulo: "Gimnasio",
      dueDate: null,
      dueAt: toDueAt(nextWeekday(hoyDe(ctx), 1, false), 8, 0, ctx.zonaHoraria),
      durationMinutes: null,
      priority: null,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
      labels: [],
      project: null,
    }),
  },
  {
    numero: 55,
    entrada: ["Comprar pan manana", "Comprar pan MAÑANA"],
    esperar: (ctx) => conFecha("Comprar pan", addDays(hoyDe(ctx), 1)),
  },
  {
    numero: 56,
    entrada: "Comprar pan mañ",
    esperar: () => ({ titulo: "Comprar pan mañ", ...SIN_ATRIBUTOS }),
  },

  // Listas de días en la recurrencia (57-59)
  {
    numero: 57,
    entrada: "Gimnasio cada lunes, miércoles y viernes por 1h",
    esperar: () => ({
      titulo: "Gimnasio",
      ...SIN_ATRIBUTOS,
      durationMinutes: 60,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    }),
  },
  {
    numero: 58,
    entrada: "Yoga cada martes y jueves",
    esperar: () => ({ titulo: "Yoga", ...SIN_ATRIBUTOS, recurrenceRule: "FREQ=WEEKLY;BYDAY=TU,TH" }),
  },
  {
    numero: 59,
    entrada: "Gimnasio cada lunes y jueves a las 8",
    esperar: (ctx) => {
      const hoy = hoyDe(ctx);
      const proximoLunes = nextWeekday(hoy, 1, false);
      const proximoJueves = nextWeekday(hoy, 4, false);
      // E12 con varios días: el ancla es la ocurrencia más próxima entre todos
      // los días de la lista, nunca la del primero que escribió el usuario.
      const ancla = compareDates(proximoLunes, proximoJueves) <= 0 ? proximoLunes : proximoJueves;
      return {
        titulo: "Gimnasio",
        dueDate: null,
        dueAt: toDueAt(ancla, 8, 0, ctx.zonaHoraria),
        durationMinutes: null,
        priority: null,
        recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,TH",
        labels: [],
        project: null,
      };
    },
  },
];
