/**
 * Modelo común de bloque para la grilla del calendario (tarea 5.4, D-F de
 * `design.md`): tareas, hábitos y eventos comparten esta forma. La grilla
 * (`components/calendar/`) no importa nada de `lib/tasks/`, `lib/habits/`
 * ni `lib/calendar/events.ts` — cada dominio arma su propio
 * `CalendarBlock` antes de pasarlo acá.
 *
 * `type` solo se usa para elegir el ícono y la forma del bloque (tarea
 * 5.5, requirement "se distinguen por forma, no solo por color"): la
 * grilla nunca lo usa para decidir una mutación ni una regla de negocio —
 * eso es del dominio, a partir del grupo 6.
 */
export type CalendarBlockType = "task" | "habit" | "event";

/** Forma mínima de una etiqueta para el bloque (D-A, grupo 2): mismos campos que `LabelChip` de `lib/tasks/`, sin importarlo — el compatibilizador estructural de TypeScript alcanza. */
export type CalendarBlockLabel = { id: string; name: string; color: string };

export type CalendarBlock = {
  id: string;
  type: CalendarBlockType;
  /** Texto plano (D2): la grilla nunca interpreta markdown ni HTML en el título. */
  title: string;
  /**
   * Color ya resuelto a hex (`#RRGGBB`) por el dominio de origen: el color
   * del proyecto, la etiqueta, el hábito, o el calendario de Google. Para un
   * evento, este es el hex crudo de Google, sin ajustar por tema — ese
   * ajuste (D-B, grupo 3) es cosa del que lo dibuja (`eventColorForTheme` en
   * `screen-blocks.ts`), no de este valor.
   */
  color: string;
  allDay: boolean;
  /**
   * Instante ISO con offset (con horario), o fecha `yyyy-MM-dd` (todo el
   * día). Para bloques de todo el día, `end` sigue la convención de Google
   * Calendar: es el día **siguiente** al último día cubierto (exclusivo),
   * incluso para un bloque de un solo día.
   */
  start: string;
  end: string;
  /**
   * Bloque de vista previa de una repetición futura (tarea 5.7): la grilla
   * lo dibuja pero nunca lo deja recibir ningún gesto — ni clic, ni
   * arrastre en el grupo 6 — porque representa algo que todavía no existe.
   */
  isPreview?: boolean;
  /** Cumplido, para una tarea o un hábito (grupo 2, D-A): `undefined` en un evento, que no tiene este concepto. */
  completed?: boolean;
  /** Emoji del hábito (`habits.icon`, obligatorio en el dominio): `undefined` en una tarea o un evento, que no tienen este concepto. */
  icon?: string;
  /** Nombre del proyecto de una tarea, si quien arma el bloque ya lo resolvió: un hábito no tiene proyecto. */
  projectName?: string;
  /** Emoji del proyecto de una tarea (`projects.icon`, opcional en el dominio), si tiene uno y quien arma el bloque ya lo resolvió: un hábito no tiene proyecto. */
  projectIcon?: string;
  /** Etiquetas de una tarea: un hábito no tiene etiquetas. */
  labels?: CalendarBlockLabel[];
  /** Nombre del calendario de origen de un evento, si quien arma el bloque ya lo resolvió. */
  calendarName?: string;
  /** Hábito salteado ese día (grupo 6/7 de `calendario-legible-y-manipulable`, D-F): se queda en el calendario, marcado — no desaparece. `undefined` en una tarea o un evento, que no tienen este concepto. */
  skipped?: boolean;
};

/**
 * Hábito sin horario fijo (tarea 6.6, requirement "aparece como un chip
 * suelto fuera de la grilla horaria"): a diferencia de `CalendarBlock`, no
 * tiene `start`/`end` propios — no ocupa ningún horario hasta que se
 * arrastra a la grilla o se programa desde el menú de su tarjeta, y en los
 * dos casos lo que se escribe es un override puntual, nunca un horario
 * fijo nuevo (D-H).
 */
export type UnscheduledHabitChip = {
  id: string;
  title: string;
  color: string;
  /** Emoji del hábito (`habits.icon`, obligatorio en el dominio). */
  icon: string;
};

export const CALENDAR_FORMATS = ["dia", "cuatro-dias", "semana", "mes"] as const;
export type CalendarFormat = (typeof CALENDAR_FORMATS)[number];

/** Sentence case (`.claude/rules/copy.md`): estos son los rótulos que ve el usuario en la barra de opciones (grupo 7). */
export const CALENDAR_FORMAT_LABELS: Record<CalendarFormat, string> = {
  dia: "Día",
  "cuatro-dias": "4 días",
  semana: "Semana",
  mes: "Mes",
};
