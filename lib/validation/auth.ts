import { z } from "zod";

/**
 * Esquemas de autenticación compartidos entre cliente y servidor (D13): el
 * mismo esquema valida el formulario de React Hook Form y la acción o
 * endpoint de servidor que crea la cuenta. La regla de 8 caracteres se
 * repite además en la configuración de Supabase Auth (tarea 4.4): la
 * validación de cliente es cortesía, no seguridad.
 */

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Falta tu nombre. Lo necesitamos para tu cuenta. Completá el campo antes de continuar.");

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email("Ingresá un correo válido, con el formato nombre@dominio.com."));

export const passwordSchema = z
  .string()
  .min(
    8,
    "La contraseña es muy corta: necesita 8 caracteres o más para proteger tu cuenta. Agregá algunos caracteres más y volvé a intentar.",
  );

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Falta tu contraseña. Completá el campo antes de continuar."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "Confirmá la contraseña nueva antes de continuar."),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message:
          "Las contraseñas no coinciden. Revisá que hayas escrito la misma en los dos campos y volvé a intentar.",
        path: ["confirmPassword"],
      });
    }
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
