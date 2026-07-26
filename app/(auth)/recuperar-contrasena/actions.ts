"use server";

import { requestPasswordResetSchema, type RequestPasswordResetInput } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { translateAuthError } from "@/lib/auth/errors";

export type RequestResetResult = { success: true } | { success: false; message: string };

/**
 * Server Action del pedido de recuperación (tarea 4.15). El enlace vuelve al
 * callback compartido (`app/(auth)/callback/route.ts`) con
 * `next=/restablecer-contrasena`: ahí es donde Supabase entrega el token,
 * no como parámetro que esta pantalla lea directamente.
 */
export async function requestPasswordResetAction(
  input: RequestPasswordResetInput,
): Promise<RequestResetResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ingresá un correo válido.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/callback?next=${encodeURIComponent("/restablecer-contrasena")}`,
  });

  if (error) {
    return { success: false, message: translateAuthError(error) };
  }

  return { success: true };
}
