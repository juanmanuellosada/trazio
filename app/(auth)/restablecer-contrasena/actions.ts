"use server";

import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/auth/errors";

export type ResetPasswordResult = { success: true } | { success: false; message: string };

/**
 * Server Action del reset (tarea 4.15d/e). La sesión de recuperación ya
 * existe acá (la dejó el intercambio de código en el callback), así que
 * `updateUser` alcanza para cambiar la contraseña y la persona queda con
 * sesión iniciada sin loguearse a mano después.
 */
export async function resetPasswordAction(input: ResetPasswordInput): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Revisá la contraseña nueva.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { success: false, message: translateAuthError(error) };
  }

  return { success: true };
}
