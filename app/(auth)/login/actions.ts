"use server";

import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/auth/errors";
import { resolveEntryPath } from "@/lib/preferences/get-default-view-path";

export type LoginResult = { success: true; redirectTo: string } | { success: false; message: string };

/**
 * Server Action de login (tarea 4.6): revalida con el mismo esquema de Zod
 * del cliente. `next` decide el destino (tarea 11.5/11.7): un deep link
 * puntual se respeta, y si no hay ninguno se resuelve con la pantalla por
 * defecto de la cuenta.
 */
export async function loginAction(input: LoginInput, next: string): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { success: false, message: translateAuthError(error) };
  }

  const redirectTo = await resolveEntryPath(data.user.id, next);
  return { success: true, redirectTo };
}
