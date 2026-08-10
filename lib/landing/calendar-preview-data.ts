import { resolveProjectColorHex, type ProjectColor } from "@/lib/validation/colors";

/**
 * Datos hardcodeados del preview de calendario de la landing, sección "Lo
 * que ya está agendado" (`openspec/changes/landing-para-la-vida-entera/
 * design.md`, decisión D-CAL). Mismo patrón que `demo-context.ts` y
 * `static-parses.ts`: datos fijos propiedad de marketing, sin lógica de
 * servidor. No reemplaza ningún dato real de calendario — es un día de
 * ejemplo, congelado, para que la sección se vea sin necesitar una cuenta
 * conectada a Google Calendar.
 */
export type CalendarPreviewBlockType = "task" | "habit" | "event";

export interface CalendarPreviewBlock {
  id: string;
  type: CalendarPreviewBlockType;
  title: string;
  /** Minutos desde medianoche. */
  startMinutes: number;
  endMinutes: number;
  colorHex: string;
}

/** Franja horaria mostrada: acotada, no 24 horas (design.md, D-CAL). */
export const CALENDAR_PREVIEW_START_HOUR = 8;
export const CALENDAR_PREVIEW_END_HOUR = 20;

// Colores reales de la app (única reutilización de `lib/` que hace este
// preview, D-CAL): `resolveProjectColorHex` es dato puro, sin "use client",
// así que resolverlo acá en build time es seguro. Tema fijo "dark" porque
// la sección entera va sobre el fondo oscuro fijo de D-DARK.
const CASA_COLOR: ProjectColor = "lima";
const SALUD_COLOR: ProjectColor = "turquesa";

/**
 * Azul ilustrativo para los eventos de Google Calendar del ejemplo. No sale
 * de `resolveProjectColorHex`: un evento sincronizado no tiene
 * `projects.color` (su color viene del calendario de Google, ver
 * `lib/calendar/screen-blocks.ts`), así que acá alcanza con un valor fijo
 * que se distinga de los colores de proyecto de arriba.
 */
const EVENT_COLOR_HEX = "#5B8DEF";

function minutesOf(hour: number, minute = 0): number {
  return hour * 60 + minute;
}

/**
 * Un martes cualquiera: una reunión de trabajo entre tareas y hábitos de
 * casa, no la agenda de un ejecutivo. Duraciones de 30-60 minutos (nunca
 * menos) para que el bloque más corto siga siendo legible en el preview
 * angosto de móvil.
 */
export const CALENDAR_PREVIEW_BLOCKS: CalendarPreviewBlock[] = [
  {
    id: "meditar",
    type: "habit",
    title: "Meditar",
    startMinutes: minutesOf(8),
    endMinutes: minutesOf(8, 30),
    colorHex: resolveProjectColorHex(SALUD_COLOR, "dark"),
  },
  {
    id: "reunion-equipo",
    type: "event",
    title: "Reunión de equipo",
    startMinutes: minutesOf(9),
    endMinutes: minutesOf(10),
    colorHex: EVENT_COLOR_HEX,
  },
  {
    id: "pagar-gas",
    type: "task",
    title: "Pagar el gas",
    startMinutes: minutesOf(11, 30),
    endMinutes: minutesOf(12),
    colorHex: resolveProjectColorHex(CASA_COLOR, "dark"),
  },
  {
    id: "almuerzo",
    type: "event",
    title: "Almuerzo con Fede",
    startMinutes: minutesOf(13),
    endMinutes: minutesOf(14),
    colorHex: EVENT_COLOR_HEX,
  },
  {
    id: "sabanas",
    type: "task",
    title: "Cambiar las sábanas",
    startMinutes: minutesOf(16, 30),
    endMinutes: minutesOf(17),
    colorHex: resolveProjectColorHex(CASA_COLOR, "dark"),
  },
  {
    id: "gimnasio",
    type: "habit",
    title: "Gimnasio",
    startMinutes: minutesOf(18),
    endMinutes: minutesOf(19),
    colorHex: resolveProjectColorHex(SALUD_COLOR, "dark"),
  },
  {
    id: "leer",
    type: "habit",
    title: "Leer",
    startMinutes: minutesOf(19, 15),
    endMinutes: minutesOf(19, 45),
    colorHex: resolveProjectColorHex(SALUD_COLOR, "dark"),
  },
];
