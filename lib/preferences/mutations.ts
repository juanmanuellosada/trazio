"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";
import { settingsDataQueryKey } from "./use-settings-data";

/** Nombre del perfil (Cuenta, bloque 9). Auto-guardado por `theme-toggle.tsx`, mismo formato de aviso. */
export function useUpdateProfileName() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess("Guardamos tu nombre.");
      queryClient.invalidateQueries({ queryKey: settingsDataQueryKey() });
    },
    onError: () =>
      toastError("No pudimos guardar tu nombre", "se cortó la conexión con el servidor", "Probá de nuevo en un momento."),
  });
}

export type PreferencesPatch = Partial<{
  timezone: string;
  date_format: DateFormatPreference;
  time_format: TimeFormatPreference;
  week_starts_on: 0 | 1 | 6;
  default_view: "bandeja" | "hoy" | "proximos";
  sound_on_complete: boolean;
  reference_time: string;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, patch }: { userId: string; patch: PreferencesPatch }) => {
      const { error } = await supabase.from("user_preferences").update(patch).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsDataQueryKey() }),
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
  const queryClient = useQueryClient();

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsDataQueryKey() }),
  });
}

/**
 * Desvincula el acceso con Google (Cuenta, bloque 9.4, decisión OQ4): la
 * sección solo ofrece esta acción cuando la cuenta también tiene contraseña
 * — desvincular el único método de acceso dejaría la cuenta sin forma de
 * entrar, así que ese caso ni siquiera llega a llamar a esta mutación (ver
 * `account-section.tsx`). `unlinkIdentity` necesita el objeto de identidad
 * completo, no un identificador de texto.
 */
export function useUnlinkGoogle() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (identity: UserIdentity) => {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
    },
    onSuccess: () => {
      toastSuccess("Desvinculamos tu cuenta de Google.");
      queryClient.invalidateQueries({ queryKey: settingsDataQueryKey() });
    },
  });
}
