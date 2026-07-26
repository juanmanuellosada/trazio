"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Envoltorio fino de `next-themes` (docs/design-system.md §8): agrega o
 * quita la clase `.dark` en `<html>` según la preferencia. "Sistema" es una
 * opción explícita del usuario (persistida en `user_preferences.theme`),
 * nunca solo `prefers-color-scheme`.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
