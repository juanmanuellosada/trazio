import {
  addDays,
  addMonths,
  addYears,
  nextOccurrenceOfMonthDay,
  nextWeekday,
  nextWeekStart,
  resolveTwoDigitYear,
  weekdayIndex,
  WEEKDAY_NAMES,
  type CalendarDate,
} from "./dates";
import { normalize } from "./normalize";
import type { ParserContext, ParserProject } from "./types";

/**
 * Reconocedores independientes (E3): cada uno recorre el texto normalizado
 * (o el original, para `#`/`@`, que preservan mayúsculas y acentos del
 * nombre) y devuelve *candidatos* con su rango `{start, end}` en el texto
 * original. Ninguno decide todavía quién gana — eso es `resolve.ts`, que
 * aplica R4 y R5 recién después de que todos los reconocedores terminaron.
 *
 * `start`/`end` ya incluyen la preposición o el artículo cuando son parte
 * léxica de la locución (R8/E4): cada patrón de acá escribe esa preposición
 * dentro de su propia expresión regular solo cuando corresponde. Un
 * determinante suelto (`el`, `del`) nunca se agrega desde afuera.
 */

export type DateCandidateKind = "relative" | "point" | "weekday-loose";

export type Candidate =
  | { attr: "date"; kind: DateCandidateKind; start: number; end: number; date: CalendarDate }
  | { attr: "hour"; start: number; end: number; hour: number; minute: number }
  | { attr: "duration"; start: number; end: number; minutes: number }
  | { attr: "recurrence"; start: number; end: number; rrule: string; anchorWeekday: number | null }
  | { attr: "priority"; start: number; end: number; value: number }
  | { attr: "label"; start: number; end: number; name: string; id: string | null }
  | {
      attr: "project";
      start: number;
      end: number;
      id: string;
      name: string;
      sectionId: string | null;
      sectionName: string | null;
    };

// ---------------------------------------------------------------------------
// Fechas relativas (casos 1-11, más los casos críticos 44-46 y 50)
// ---------------------------------------------------------------------------

/**
 * La familia de "mañana" en un único patrón, ordenado de la locución más
 * específica a la más general (`pasado mañana` antes que `mañana` sola):
 * es la única forma de que "de la mañana"/"a la mañana" (que no producen
 * ningún atributo) bloqueen que la alternativa genérica `mañana` vuelva a
 * matchear la misma palabra un poco más adelante en el mismo recorrido del
 * `RegExp` (casos 44 y 46, los críticos del contrato).
 */
const MORNING_FAMILY = new RegExp(
  ["pasado\\s+manana", "esta\\s+manana", "de\\s+la\\s+manana", "a\\s+la\\s+manana", "de\\s+manana", "manana"].join(
    "|",
  ),
  "g",
);

export function recognizeRelativeDate(
  normalized: string,
  hoy: CalendarDate,
  semanaEmpiezaEn: 0 | 1 | 6,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const match of normalized.matchAll(MORNING_FAMILY)) {
    const text = match[0];
    const start = match.index;
    const end = start + text.length;
    if (text === "de la manana" || text === "a la manana") continue; // momento del día: ningún atributo (casos 44, 46)
    const days = text === "pasado manana" ? 2 : text === "esta manana" ? 0 : 1; // esta/de/bare manana → hoy / hoy+1
    candidates.push({ attr: "date", kind: "relative", start, end, date: addDays(hoy, days) });
  }

  const hoyMatch = /\bhoy\b/g.exec(normalized);
  if (hoyMatch) {
    candidates.push({ attr: "date", kind: "relative", start: hoyMatch.index, end: hoyMatch.index + 3, date: hoy });
  }

  const ayerMatch = /\bayer\b/g.exec(normalized);
  if (ayerMatch) {
    candidates.push({
      attr: "date",
      kind: "relative",
      start: ayerMatch.index,
      end: ayerMatch.index + 4,
      date: addDays(hoy, -1),
    });
  }

  const weekendMatch = /\beste\s+fin\s+de\s+semana\b/g.exec(normalized);
  if (weekendMatch) {
    const dow = new Date(Date.UTC(hoy.y, hoy.m - 1, hoy.d)).getUTCDay();
    const isWeekend = dow === 0 || dow === 6; // R10/E17: en fin de semana, "este fin de semana" es hoy
    candidates.push({
      attr: "date",
      kind: "relative",
      start: weekendMatch.index,
      end: weekendMatch.index + weekendMatch[0].length,
      date: isWeekend ? hoy : nextWeekday(hoy, 6, false),
    });
  }

  const nextWeekMatch = /\bproxima\s+semana\b/g.exec(normalized);
  if (nextWeekMatch) {
    candidates.push({
      attr: "date",
      kind: "relative",
      start: nextWeekMatch.index,
      end: nextWeekMatch.index + nextWeekMatch[0].length,
      date: nextWeekStart(hoy, semanaEmpiezaEn),
    });
  }

  const nextWeekdayRe = /\b(?:el\s+)?proximo\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/g;
  for (const match of normalized.matchAll(nextWeekdayRe)) {
    const dow = weekdayIndex(match[1]);
    candidates.push({
      attr: "date",
      kind: "relative",
      start: match.index,
      end: match.index + match[0].length,
      date: nextWeekday(hoy, dow, false),
    });
  }

  const inUnitsRe = /\ben\s+(\d+)\s+(dias?|semanas?|meses|anos?)\b/g;
  for (const match of normalized.matchAll(inUnitsRe)) {
    const amount = Number(match[1]);
    const unit = match[2];
    const date = unit.startsWith("dia")
      ? addDays(hoy, amount)
      : unit.startsWith("semana")
        ? addDays(hoy, amount * 7)
        : unit.startsWith("mes")
          ? addMonths(hoy, amount)
          : addYears(hoy, amount);
    candidates.push({
      attr: "date",
      kind: "relative",
      start: match.index,
      end: match.index + match[0].length,
      date,
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Fechas puntuales (casos 12-18)
// ---------------------------------------------------------------------------

const MONTHS_FULL = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MONTHS_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthNumberOf(name: string): number {
  const full = MONTHS_FULL.indexOf(name);
  if (full !== -1) return full + 1;
  return MONTHS_ABBR.indexOf(name) + 1;
}

// El nombre completo va primero en la alternancia: si no, "mar" (la
// abreviatura) matchearía antes de que el motor llegue a intentar "marzo" y
// dejaría "zo" colgando en el texto.
const NOMINAL_DATE_RE = new RegExp(
  `\\b(\\d{1,2})\\s+de\\s+(${[...MONTHS_FULL, ...MONTHS_ABBR].join("|")})\\b(?:\\s+de\\s+(\\d{4}))?`,
  "g",
);

// `\b` a los dos lados evita que la coincidencia caiga en medio de un
// número más largo (caso 48: "4567-8900" no es una fecha).
const NUMERIC_DATE_RE = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g;

export function recognizePointDate(normalized: string, hoy: CalendarDate): Candidate[] {
  const candidates: Candidate[] = [];

  for (const match of normalized.matchAll(NOMINAL_DATE_RE)) {
    const day = Number(match[1]);
    const month = monthNumberOf(match[2]);
    const year = match[3] ? Number(match[3]) : null;
    const date = year != null ? { y: year, m: month, d: day } : nextOccurrenceOfMonthDay(hoy, month, day);
    candidates.push({
      attr: "date",
      kind: "point",
      start: match.index,
      end: match.index + match[0].length,
      date,
    });
  }

  for (const match of normalized.matchAll(NUMERIC_DATE_RE)) {
    const day = Number(match[1]);
    const month = Number(match[2]); // R1: día primero, siempre.
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const year = match[3] ? resolveTwoDigitYear(Number(match[3])) : null;
    const date = year != null ? { y: year, m: month, d: day } : nextOccurrenceOfMonthDay(hoy, month, day);
    candidates.push({
      attr: "date",
      kind: "point",
      start: match.index,
      end: match.index + match[0].length,
      date,
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Día de la semana suelto (casos 19-21) — R4 lo descarta en la resolución,
// no acá: el reconocedor no sabe si hay otra fecha en el resto del texto.
// ---------------------------------------------------------------------------

// `(?<!cada\s+)`: "cada lunes" es repetición (recognizeRecurrence), no una
// fecha — sin esta exclusión, "lunes" se reconocería también como día
// suelto y, sin otra fecha en el texto con la que R4 lo descarte, ganaría
// por defecto (E12: la recurrencia sola no fija ancla).
const WEEKDAY_LOOSE_RE = new RegExp(`(?<!cada\\s+)\\b(${WEEKDAY_NAMES.join("|")})\\b`, "g");

export function recognizeWeekdayLoose(normalized: string, hoy: CalendarDate): Candidate[] {
  const candidates: Candidate[] = [];
  for (const match of normalized.matchAll(WEEKDAY_LOOSE_RE)) {
    const dow = weekdayIndex(match[1]);
    candidates.push({
      attr: "date",
      kind: "weekday-loose",
      start: match.index,
      end: match.index + match[0].length,
      date: nextWeekday(hoy, dow, false), // R10: nunca hoy, aunque hoy sea ese día.
    });
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// Horas (casos 22-27)
// ---------------------------------------------------------------------------

/** R3: sin AM/PM, 1-7 es de la tarde, 8-12 es de la mañana. Con AM/PM explícito, se usa tal cual. */
function resolveHour(hour: number, meridiem: "am" | "pm" | null): number {
  if (meridiem === "pm") return hour < 12 ? hour + 12 : hour;
  if (meridiem === "am") return hour === 12 ? 0 : hour;
  return hour >= 1 && hour <= 7 ? hour + 12 : hour; // 8-12 quedan como están (mañana).
}

// "a las" con o sin AM/PM: así "a las 3pm" (caso 53) se consume entero, sin
// dejar "a las" huérfano en el título.
const A_LAS_RE = /\ba\s+las\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/g;
const BARE_MERIDIEM_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/g;

export function recognizeHour(normalized: string): Candidate[] {
  const candidates: Candidate[] = [];

  for (const match of normalized.matchAll(A_LAS_RE)) {
    const hour = Number(match[1]);
    if (hour > 23) continue;
    const minute = match[2] ? Number(match[2]) : 0;
    const meridiem = (match[3] as "am" | "pm" | undefined) ?? null;
    candidates.push({
      attr: "hour",
      start: match.index,
      end: match.index + match[0].length,
      hour: resolveHour(hour, meridiem),
      minute,
    });
  }

  for (const match of normalized.matchAll(BARE_MERIDIEM_RE)) {
    const hour = Number(match[1]);
    if (hour > 12) continue;
    const minute = match[2] ? Number(match[2]) : 0;
    candidates.push({
      attr: "hour",
      start: match.index,
      end: match.index + match[0].length,
      hour: resolveHour(hour, match[3] as "am" | "pm"),
      minute,
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Duraciones (casos 28-30)
// ---------------------------------------------------------------------------

const HOUR_MIN_RE = /\b(\d{1,2})h(?:(\d{1,2})m)?\b/g;
const POR_MIN_RE = /\bpor\s+(\d{1,2})\s*min\b/g;
const HORAS_RE = /\b(\d{1,2})\s*horas?\b/g;

export function recognizeDuration(normalized: string): Candidate[] {
  const candidates: Candidate[] = [];

  for (const match of normalized.matchAll(HOUR_MIN_RE)) {
    const hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    candidates.push({
      attr: "duration",
      start: match.index,
      end: match.index + match[0].length,
      minutes: hours * 60 + minutes,
    });
  }

  for (const match of normalized.matchAll(POR_MIN_RE)) {
    candidates.push({
      attr: "duration",
      start: match.index,
      end: match.index + match[0].length,
      minutes: Number(match[1]),
    });
  }

  for (const match of normalized.matchAll(HORAS_RE)) {
    candidates.push({
      attr: "duration",
      start: match.index,
      end: match.index + match[0].length,
      minutes: Number(match[1]) * 60,
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Repetición (casos 31-37, más el caso 54 mixto)
// ---------------------------------------------------------------------------

const WEEKDAY_RRULE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Igual que la familia de "mañana": una sola alternancia, ordenada de la
// locución más específica ("cada día laborable") a la más general ("cada
// día"), para que la más específica se coma la palabra entera y la general
// no la vuelva a matchear suelta.
const RECURRENCE_RE = new RegExp(
  [
    "cada\\s+dia\\s+laborable",
    "cada\\s+(\\d+)\\s+semanas?",
    `cada\\s+(${WEEKDAY_NAMES.join("|")})`,
    "cada\\s+dia\\b",
    "cada\\s+semana\\b",
    "cada\\s+mes\\b",
    "cada\\s+ano\\b",
  ].join("|"),
  "g",
);

export function recognizeRecurrence(normalized: string): Candidate[] {
  const candidates: Candidate[] = [];
  for (const match of normalized.matchAll(RECURRENCE_RE)) {
    const text = match[0];
    const start = match.index;
    const end = start + text.length;
    if (text.includes("laborable")) {
      candidates.push({
        attr: "recurrence",
        start,
        end,
        rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        anchorWeekday: null,
      });
    } else if (match[1]) {
      candidates.push({ attr: "recurrence", start, end, rrule: `FREQ=WEEKLY;INTERVAL=${match[1]}`, anchorWeekday: null });
    } else if (match[2]) {
      const dow = weekdayIndex(match[2]);
      candidates.push({
        attr: "recurrence",
        start,
        end,
        rrule: `FREQ=WEEKLY;BYDAY=${WEEKDAY_RRULE[dow]}`,
        anchorWeekday: dow,
      });
    } else if (text.startsWith("cada dia")) {
      candidates.push({ attr: "recurrence", start, end, rrule: "FREQ=DAILY", anchorWeekday: null });
    } else if (text.startsWith("cada semana")) {
      candidates.push({ attr: "recurrence", start, end, rrule: "FREQ=WEEKLY", anchorWeekday: null });
    } else if (text.startsWith("cada mes")) {
      candidates.push({ attr: "recurrence", start, end, rrule: "FREQ=MONTHLY", anchorWeekday: null });
    } else if (text.startsWith("cada ano")) {
      candidates.push({ attr: "recurrence", start, end, rrule: "FREQ=YEARLY", anchorWeekday: null });
    }
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// Símbolos: prioridad, etiquetas y proyecto/sección (casos 38-43)
// ---------------------------------------------------------------------------

const PRIORITY_RE = /\bp([1-4])\b/g;
const LABEL_RE = /#([^\s#@]+)/g;

function normalizeLabelName(name: string): string {
  return normalize(name);
}

type ProjectPath = {
  normalizedPath: string;
  kind: "project" | "section";
  id: string;
  name: string;
  sectionId: string | null;
  sectionName: string | null;
};

/** E7: coincidencia más larga contra la lista real de proyectos y secciones. Empate proyecto/sección → gana el proyecto. */
function buildProjectPaths(proyectos: ParserProject[]): ProjectPath[] {
  const paths: ProjectPath[] = [];
  for (const project of proyectos) {
    paths.push({
      normalizedPath: normalize(project.path),
      kind: "project",
      id: project.id,
      name: project.name,
      sectionId: null,
      sectionName: null,
    });
    for (const section of project.sections) {
      paths.push({
        normalizedPath: normalize(`${project.path}/${section.name}`),
        kind: "section",
        id: project.id,
        name: project.name,
        sectionId: section.id,
        sectionName: section.name,
      });
    }
  }
  // Más largo primero (coincidencia más larga); a igual longitud, el proyecto gana sobre la sección.
  return paths.sort((a, b) => b.normalizedPath.length - a.normalizedPath.length || (a.kind === "project" ? -1 : 1));
}

function isWordChar(char: string | undefined): boolean {
  return char != null && /[a-z0-9]/i.test(char);
}

export function recognizeSymbols(original: string, normalized: string, ctx: ParserContext): Candidate[] {
  const candidates: Candidate[] = [];

  for (const match of normalized.matchAll(PRIORITY_RE)) {
    candidates.push({
      attr: "priority",
      start: match.index,
      end: match.index + match[0].length,
      value: Number(match[1]),
    });
  }

  for (const match of original.matchAll(LABEL_RE)) {
    const name = match[1];
    const existing = ctx.etiquetas.find((label) => normalizeLabelName(label.name) === normalizeLabelName(name));
    candidates.push({
      attr: "label",
      start: match.index!,
      end: match.index! + match[0].length,
      name,
      id: existing?.id ?? null,
    });
  }

  const paths = buildProjectPaths(ctx.proyectos);
  if (paths.length > 0) {
    const atRe = /@/g;
    for (const at of normalized.matchAll(atRe)) {
      const start = at.index;
      const afterAt = start + 1;
      for (const candidate of paths) {
        const slice = normalized.slice(afterAt, afterAt + candidate.normalizedPath.length);
        if (slice !== candidate.normalizedPath) continue;
        const end = afterAt + candidate.normalizedPath.length;
        if (isWordChar(normalized[end])) continue; // no cortar un nombre más largo a la mitad
        candidates.push({
          attr: "project",
          start,
          end,
          id: candidate.id,
          name: candidate.name,
          sectionId: candidate.sectionId,
          sectionName: candidate.sectionName,
        });
        break; // primera coincidencia de la lista ordenada = la más larga
      }
    }
  }

  return candidates;
}
