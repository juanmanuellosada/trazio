import { z } from "zod";
import {
  PROJECT_COLOR_IDS,
  hasSufficientProjectColorContrast,
  isValidProjectHexColor,
} from "./colors";

/**
 * Esquema de hábito (bloque 2 de fase 3, tarea 2.10). El color sigue el
 * mismo criterio que `lib/validation/labels.ts`: paleta fija o hex
 * personalizado con la misma validación de contraste AA (D19, D29,
 * extendido a hábitos por el requirement "El color de un hábito sigue la
 * misma paleta y validación que proyectos"), reusando los mismos helpers de
 * `lib/validation/colors.ts` sin duplicar esa lógica.
 *
 * Las tres formas de repetirse son un `discriminatedUnion` sobre
 * `frequency_type` en vez de campos opcionales sueltos: espeja exactamente
 * los checks de la migración `20260729170000_habits.sql` — `times_per_week`
 * solo existe (y es obligatorio) para `times_per_week`, `days_of_week` solo
 * para `specific_days` — así que un valor puesto en el tipo equivocado ni
 * siquiera tipa, no hace falta un `.refine()` para rechazarlo.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Falta el nombre del hábito. Completá el campo antes de continuar.")
  .max(120, "El nombre es muy largo: como máximo 120 caracteres.");

const colorSchema = z
  .string()
  .min(1, "Falta elegir un color. Elegí uno de la paleta o un color personalizado.")
  .superRefine((value, ctx) => {
    if ((PROJECT_COLOR_IDS as readonly string[]).includes(value)) return;
    if (!isValidProjectHexColor(value)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Ese color no es válido porque no es ninguno de la paleta ni un color personalizado bien formado. Elegí un color de la lista o escribí un hexadecimal de seis dígitos, como #4F46E5.",
      });
      return;
    }
    if (!hasSufficientProjectColorContrast(value)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Ese color personalizado no se guardó porque no se lee bien contra el fondo de la app en modo claro o en modo oscuro. Probá un tono más oscuro o más saturado, o elegí uno de la paleta.",
      });
    }
  });

// Un ícono es un solo emoji, igual que `lib/validation/projects.ts` — pero
// acá es obligatorio (requirement "Campos de un hábito": todo hábito tiene
// ícono, a diferencia de un proyecto, que puede quedar sin uno).
const iconSchema = z
  .string()
  .trim()
  .min(1, "Falta elegir un ícono. Elegí un emoji para el hábito.")
  .max(8, "El ícono tiene que ser un solo emoji.")
  .refine((value) => /\p{Extended_Pictographic}/u.test(value), {
    message: "El ícono tiene que ser un emoji.",
  });

const durationMinutesSchema = z
  .number()
  .int()
  .positive("La duración tiene que ser mayor a cero.");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduledTimeSchema = z
  .string()
  .trim()
  .regex(TIME_PATTERN, "La hora tiene que tener el formato HH:MM.")
  .optional()
  .transform((value) => (!value ? null : value));

const daysOfWeekSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1, "Elegí al menos un día para el hábito.");

const timesPerWeekSchema = z
  .number()
  .int()
  .min(1, "Elegí entre 1 y 7 veces por semana.")
  .max(7, "Elegí entre 1 y 7 veces por semana.");

const commonFields = {
  name: nameSchema,
  icon: iconSchema,
  color: colorSchema,
  duration_minutes: durationMinutesSchema,
  scheduled_time: scheduledTimeSchema,
};

export const habitFormSchema = z.discriminatedUnion("frequency_type", [
  z.object({ frequency_type: z.literal("daily"), ...commonFields }),
  z.object({ frequency_type: z.literal("times_per_week"), ...commonFields, times_per_week: timesPerWeekSchema }),
  z.object({ frequency_type: z.literal("specific_days"), ...commonFields, days_of_week: daysOfWeekSchema }),
]);

export type HabitFormValues = z.input<typeof habitFormSchema>;
export type HabitFormOutput = z.output<typeof habitFormSchema>;
