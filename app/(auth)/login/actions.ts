"use server";

import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/auth/errors";

export type LoginResult = { success: true } | { success: false; message: string };

/** Server Action de login (tarea 4.6): revalida con el mismo esquema de Zod del cliente. */
export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { success: false, message: translateAuthError(error) };
  }

  return { success: true };
}
