/**
 * Tipos del parser de lenguaje natural (bloque 9, E1 del design): la firma
 * pública es la función pura `parse(texto, contexto)` de `./parse`. Todo lo
 * demás en `lib/parser/` es implementación de esa función.
 */

/** Sección de un proyecto, tal como la necesita la resolución de `@` (E7). */
export type ParserProjectSection = { id: string; name: string };

/**
 * Proyecto tal como lo recibe el parser (E1/E7): `path` ya viene resuelto
 * por el llamador como la cadena de ancestros ("Trabajo" o
 * "Trabajo/Personal", hasta 3 niveles) — el parser no camina `parent_id`,
 * solo compara texto.
 */
export type ParserProject = {
  id: string;
  name: string;
  path: string;
  sections: ParserProjectSection[];
};

export type ParserLabel = { id: string; name: string };

/**
 * Contexto explícito del que depende toda resolución (E1): el parser nunca
 * lee `Date.now()` ni el `Intl` del sistema. `semanaEmpiezaEn` sigue la
 * convención de `getUTCDay()` (0 = domingo … 6 = sábado), la misma que usa
 * `user_preferences.week_starts_on`.
 */
export type ParserContext = {
  ahora: Date;
  zonaHoraria: string;
  semanaEmpiezaEn: 0 | 1 | 6;
  proyectos: ParserProject[];
  etiquetas: ParserLabel[];
};

/** Etiqueta reconocida por `#`: `id` es `null` cuando no existe todavía y el alta rápida la va a crear (OQ1). */
export type ParsedLabel = { id: string | null; name: string };

/** Proyecto (y, opcionalmente, sección) reconocido por `@` (E7). `@` nunca crea: sin coincidencia no hay candidato. */
export type ParsedProject = {
  id: string;
  name: string;
  section: { id: string; name: string } | null;
};

/**
 * Rango de caracteres del texto original que produjo un atributo — lo que
 * se resalta en vivo (R7) y se remueve del título. `attr` es lo que le
 * permite a la interfaz saber qué descartar cuando el usuario desactiva
 * ese resaltado con doble clic (bloque 9.20-9.22).
 */
export type ParseMatch = {
  start: number;
  end: number;
  attr: "date" | "hour" | "duration" | "recurrence" | "priority" | "label" | "project";
};

export type ParseResult = {
  title: string;
  /** `yyyy-MM-dd`, calendario del usuario. Excluyente con `dueAt` (igual que la columna de la base). */
  dueDate: string | null;
  /** Instante UTC en ISO 8601, ya convertido desde la hora local del usuario. */
  dueAt: string | null;
  durationMinutes: number | null;
  /** 1 (Urgente) a 4 (Baja). */
  priority: number | null;
  /** RRULE (RFC 5545). En fase 1 nada la interpreta (E12): solo se guarda. */
  recurrenceRule: string | null;
  labels: ParsedLabel[];
  project: ParsedProject | null;
  matches: ParseMatch[];
};
