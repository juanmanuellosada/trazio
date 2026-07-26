"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { ThemePreference } from "@/lib/preferences/get-theme-preference";

/**
 * Sincroniza `user_preferences.theme` (servidor) con `next-themes` cuando
 * difieren del valor en `localStorage` — el caso de un dispositivo nuevo
 * donde todavía no hay nada guardado localmente. Solo compara al montar: el
 * selector de tema (`theme-toggle.tsx`) ya mantiene ambos en sync después del
 * primer ingreso.
 */
export function ThemeSync({ serverTheme }: { serverTheme: ThemePreference }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== serverTheme) {
      setTheme(serverTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
