"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import type { ThemePreference } from "./get-theme-preference";

const THEMES: readonly ThemePreference[] = ["light", "dark", "system"];

/**
 * Persiste la preferencia de tema en `user_preferences.theme` (bloque 5.5).
 * El cambio visual ya ocurrió en el cliente vía `next-themes`; esto solo
 * asegura que otro dispositivo la vea en su primer ingreso (ver
 * `get-theme-preference.ts`).
 */
export async function updateThemePreference(theme: string): Promise<void> {
  if (!THEMES.includes(theme as ThemePreference)) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .update({ theme: theme as ThemePreference })
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}
