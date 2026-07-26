"use server";

import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { translateAuthError } from "@/lib/auth/errors";

export type RegisterResult =
  | { success: true; needsConfirmation: boolean }
  | { success: false; message: string };

/**
 * Server Action de registro (tarea 4.5). Revalida con el mismo esquema de
 * Zod que el cliente (D13): la validación de cliente es cortesía, no
 * seguridad. `full_name` va en los metadatos porque el trigger de
 * aprovisionamiento (3.12) lo lee de ahí.
 */
export async function registerAction(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.",
    };
  }

  const { name, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${getSiteUrl()}/callback`,
    },
  });

  if (error) {
    return { success: false, message: translateAuthError(error) };
  }

  // Si la confirmación de correo estuviera desactivada en Supabase Auth,
  // `signUp` ya deja una sesión iniciada: ahí no corresponde la pantalla de
  // "revisá tu correo" porque no hay nada que confirmar.
  return { success: true, needsConfirmation: !data.session };
}
