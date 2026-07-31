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

export type CalendarBlock = {
  id: string;
  type: CalendarBlockType;
  /** Texto plano (D2): la grilla nunca interpreta markdown ni HTML en el título. */
  title: string;
  /** Color ya resuelto a hex (`#RRGGBB`) por el dominio de origen: el color del proyecto, la etiqueta, el hábito, o el calendario de Google. */
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
