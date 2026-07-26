import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Tema inicial para el `<html>` del layout raíz (bloque 5.5): se lee acá,
 * en el servidor, para que `next-themes` reciba un `defaultTheme` correcto
 * antes del primer pintado y no haya parpadeo. Sin sesión, "system" (no hay
 * preferencia que leer). `next-themes` solo usa este valor en el primer
 * ingreso desde un dispositivo nuevo; después manda el `localStorage` de
 * ese dispositivo, que el selector de tema (`theme-toggle.tsx`) actualiza
 * junto con la fila en `user_preferences`.
 */
export async function getThemePreference(): Promise<ThemePreference> {
  const user = await getCurrentUser();
  if (!user) {
    return "system";
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("theme")
    .eq("user_id", user.id)
    .single();

  return (data?.theme as ThemePreference | undefined) ?? "system";
}
