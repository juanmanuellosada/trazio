"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";

/** Nombre del perfil (Perfil, tarea 11.2). Auto-guardado por `theme-toggle.tsx`, mismo formato de aviso. */
export function useUpdateProfileName() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => toastSuccess("Guardamos tu nombre."),
    onError: () =>
      toastError("No pudimos guardar tu nombre", "se cortó la conexión con el servidor", "Probá de nuevo en un momento."),
  });
}

export type PreferencesPatch = Partial<{
  timezone: string;
  date_format: DateFormatPreference;
  time_format: TimeFormatPreference;
  week_starts_on: 0 | 1 | 6;
  default_view: "bandeja" | "hoy";
}>;

/**
 * Zona horaria, formato de fecha/hora, día de inicio de semana y pantalla
 * por defecto (General, tarea 11.4/11.5): cada campo se guarda solo, sin
 * botón de "Guardar" aparte — mismo patrón instantáneo que el tema. El
 * llamador hace `router.refresh()` en `onSuccess` para que el resto de la
 * app (panel lateral, Hoy, alta rápida) vea el valor nuevo sin recargar a
 * mano, ya que `PreferencesProvider` se siembra una sola vez desde el
 * Server Component del layout.
 */
export function useUpdatePreferences() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ userId, patch }: { userId: string; patch: PreferencesPatch }) => {
      const { error } = await supabase.from("user_preferences").update(patch).eq("user_id", userId);
      if (error) throw error;
    },
    onError: () =>
      toastError("No pudimos guardar el cambio", "se cortó la conexión con el servidor", "Probá de nuevo en un momento."),
  });
}

/**
 * Cambiar o establecer la contraseña (tarea 11.2). Una cuenta que ya tiene
 * contraseña se reautentica primero con `currentPassword` (D_google): sin
 * eso, cualquiera con la sesión abierta podría cambiarla sin saber la
 * actual. Una cuenta que entró con Google y todavía no tiene una
 * (`currentPassword` ausente) salta directo a `updateUser`, que la
 * establece por primera vez sin pedir un dato que no existe.
 */
export function useChangePassword() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: { email: string | null; currentPassword?: string; password: string }) => {
      if (input.currentPassword) {
        if (!input.email) throw new Error("No pudimos identificar tu cuenta.");
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.currentPassword,
        });
        if (reauthError) throw reauthError;
      }

      const { error } = await supabase.auth.updateUser({ password: input.password });
      if (error) throw error;
    },
  });
}
