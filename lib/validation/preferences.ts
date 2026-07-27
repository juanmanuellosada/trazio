import { z } from "zod";
import { nameSchema, passwordSchema } from "./auth";

/**
 * Esquemas de la pantalla de configuración (bloque 11). Los valores
 * permitidos de fecha/hora/semana/vista son los de B4 del design de fase
 * 1: el check constraint de `user_preferences` repite exactamente estos
 * mismos conjuntos, así que un valor que pasa acá nunca choca con la base.
 */

export const profileNameSchema = z.object({ name: nameSchema });
export type ProfileNameInput = z.infer<typeof profileNameSchema>;

const NEW_PASSWORD_FIELDS = {
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmá la contraseña nueva antes de continuar."),
};

function checkPasswordsMatch(data: { password: string; confirmPassword: string }, ctx: z.RefinementCtx) {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Las contraseñas no coinciden. Revisá que hayas escrito la misma en los dos campos y volvé a intentar.",
      path: ["confirmPassword"],
    });
  }
}

/** Primera contraseña de una cuenta que entró con Google y todavía no tiene una. */
export const setPasswordSchema = z.object(NEW_PASSWORD_FIELDS).superRefine(checkPasswordsMatch);
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/** Cambio de contraseña de una cuenta que ya tiene una: pide la actual. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Falta tu contraseña actual. Completá el campo antes de continuar."),
    ...NEW_PASSWORD_FIELDS,
  })
  .superRefine(checkPasswordsMatch);
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const DATE_FORMAT_OPTIONS = ["dd-MM-yyyy", "yyyy-MM-dd"] as const;
export const dateFormatSchema = z.enum(DATE_FORMAT_OPTIONS);

export const TIME_FORMAT_OPTIONS = [24, 12] as const;
export const timeFormatSchema = z.union([z.literal(24), z.literal(12)]);

/** Orden de presentación: lunes primero, como el resto de la app. */
export const WEEK_STARTS_ON_OPTIONS = [1, 0, 6] as const;
export const weekStartsOnSchema = z.union([z.literal(1), z.literal(0), z.literal(6)]);

export const DEFAULT_VIEW_OPTIONS = ["bandeja", "hoy"] as const;
export const defaultViewSchema = z.enum(DEFAULT_VIEW_OPTIONS);

export const timezoneSchema = z.string().trim().min(1, "Elegí una zona horaria.");
