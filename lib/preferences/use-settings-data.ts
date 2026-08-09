"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";

export type SettingsData = {
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  /** Si la cuenta ya tiene una contraseña (D_google): sin esto, el
   * formulario de cambio no sabría si pedir la contraseña actual o no. */
  hasPassword: boolean;
  /** Identidad completa de Google si está vinculada, `null` si no —
   * `supabase.auth.unlinkIdentity()` necesita el objeto entero, no solo un
   * booleano (bloque 9.4, OQ4). */
  googleIdentity: UserIdentity | null;
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  weekStartsOn: 0 | 1 | 6;
  defaultView: "bandeja" | "hoy" | "proximos";
  /** Interruptor de `sonido-al-completar` (General, D-D): viene encendido. */
  soundOnComplete: boolean;
  /** Hora de referencia (Notificaciones y recordatorios, `recordatorios-con-hora-de-referencia` D-A). Hora de reloj `"HH:mm:ss"`. */
  referenceTime: string;
};

export function settingsDataQueryKey() {
  return ["settings", "data"] as const;
}

/**
 * Datos de la sección Cuenta y General del modal de configuración (bloque
 * 9). A diferencia de la vieja pantalla (`getSettingsData` en Server
 * Component), esto corre en el cliente: el modal se abre desde cualquier
 * vista sin navegar a una ruta separada (spec de `configuracion`), así que
 * no hay un Server Component de página que le sirva los datos ya
 * resueltos. Usa `supabase.auth.getUser()` en vez del `getClaims()` local
 * que usa el resto de la app porque necesita `identities`, que no viaja en
 * el JWT.
 */
async function fetchSettingsData(): Promise<SettingsData> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw userError ?? new Error("No hay una sesión activa.");
  }
  const userId = userData.user.id;

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).single(),
    supabase
      .from("user_preferences")
      .select("timezone, date_format, time_format, week_starts_on, default_view, sound_on_complete, reference_time")
      .eq("user_id", userId)
      .single(),
  ]);

  const identities = userData.user.identities ?? [];

  return {
    userId,
    email: userData.user.email ?? null,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    hasPassword: identities.some((identity) => identity.provider === "email"),
    googleIdentity: identities.find((identity) => identity.provider === "google") ?? null,
    timezone: preferences?.timezone ?? "America/Argentina/Buenos_Aires",
    dateFormat: (preferences?.date_format as DateFormatPreference | undefined) ?? "dd-MM-yyyy",
    timeFormat: (preferences?.time_format as TimeFormatPreference | undefined) ?? 24,
    weekStartsOn: (preferences?.week_starts_on as 0 | 1 | 6 | undefined) ?? 1,
    defaultView: (preferences?.default_view as "bandeja" | "hoy" | "proximos" | undefined) ?? "bandeja",
    soundOnComplete: preferences?.sound_on_complete ?? true,
    referenceTime: preferences?.reference_time ?? "09:00:00",
  };
}

export function useSettingsData(enabled: boolean) {
  return useQuery({ queryKey: settingsDataQueryKey(), queryFn: fetchSettingsData, enabled });
}
