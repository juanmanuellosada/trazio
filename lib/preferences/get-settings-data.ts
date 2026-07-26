import { createClient } from "@/lib/supabase/server";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";
import type { ThemePreference } from "./get-theme-preference";

export type SettingsData = {
  userId: string;
  email: string | null;
  fullName: string | null;
  /** Si la cuenta ya tiene una contraseña (D_google, tarea 11.2): sin esto, el
   * formulario de cambio no sabría si pedir la contraseña actual o no. */
  hasPassword: boolean;
  theme: ThemePreference;
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  weekStartsOn: 0 | 1 | 6;
  defaultView: "bandeja" | "hoy";
};

/**
 * Todo lo que necesita la pantalla de configuración (bloque 11) en una sola
 * lectura de servidor. Usa `supabase.auth.getUser()` en vez del
 * `getCurrentUser()` habitual (basado en claims del JWT) porque necesita
 * `identities`, que no viaja en el JWT: es lo único que distingue a una
 * cuenta que entró con Google y todavía no tiene contraseña propia.
 */
export async function getSettingsData(userId: string): Promise<SettingsData> {
  const supabase = await createClient();
  const [{ data: userData }, { data: profile }, { data: preferences }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
    supabase
      .from("user_preferences")
      .select("theme, timezone, date_format, time_format, week_starts_on, default_view")
      .eq("user_id", userId)
      .single(),
  ]);

  const hasPassword = userData?.user?.identities?.some((identity) => identity.provider === "email") ?? false;

  return {
    userId,
    email: userData?.user?.email ?? null,
    fullName: profile?.full_name ?? null,
    hasPassword,
    theme: (preferences?.theme as ThemePreference | undefined) ?? "system",
    timezone: preferences?.timezone ?? "America/Argentina/Buenos_Aires",
    dateFormat: (preferences?.date_format as DateFormatPreference | undefined) ?? "dd/MM/yyyy",
    timeFormat: (preferences?.time_format as TimeFormatPreference | undefined) ?? 24,
    weekStartsOn: (preferences?.week_starts_on as 0 | 1 | 6 | undefined) ?? 1,
    defaultView: (preferences?.default_view as "bandeja" | "hoy" | undefined) ?? "bandeja",
  };
}
