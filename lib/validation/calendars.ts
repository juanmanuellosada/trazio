import { z } from "zod";

/**
 * Nombre de un calendario de Google (tarea 4.1, capacidad
 * `administracion-de-calendarios`): se usa tanto para crear como para
 * renombrar. A diferencia de `lib/validation/colors.ts`, acá no hay ningún
 * esquema de color — el color de un calendario de Google sale de la paleta
 * que admite la propia API de Google, no de la paleta fija de Trazio (D19),
 * y se valida contra la lista que devuelve
 * `lib/calendar/google-calendars-client.ts`, no con Zod.
 */
export const calendarNameSchema = z
  .string()
  .trim()
  .min(1, "Falta el nombre del calendario. Completá el campo antes de continuar.")
  .max(100, "El nombre es muy largo: como máximo 100 caracteres.");

export const calendarFormSchema = z.object({ name: calendarNameSchema });

export type CalendarFormValues = z.input<typeof calendarFormSchema>;
export type CalendarFormOutput = z.output<typeof calendarFormSchema>;
