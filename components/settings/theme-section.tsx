"use client";

import { useId } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { updateThemePreference } from "@/lib/preferences/theme-action";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

/**
 * Sección Tema (tarea 11.3): mismas tres opciones y el mismo mecanismo de
 * persistencia que el selector del panel lateral (`theme-toggle.tsx`), acá
 * como grupo de radios visibles en vez de menú desplegable — más cómodo en
 * una pantalla dedicada, sin perder la semántica nativa de radio (foco,
 * lectura de estado por lectores de pantalla) que un `<button>` con
 * `aria-pressed` no da gratis.
 */
export function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const groupId = useId();

  async function handleChange(value: (typeof OPTIONS)[number]["value"]) {
    setTheme(value);
    try {
      await updateThemePreference(value);
    } catch {
      toastError(
        "No pudimos guardar tu preferencia de tema",
        "se cortó la conexión con el servidor",
        "Probá de nuevo en un momento.",
      );
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Tema</h2>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Elegí el tema de la interfaz</legend>
        {OPTIONS.map((option) => {
          const inputId = `${groupId}-${option.value}`;
          const checked = (theme ?? "system") === option.value;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                "flex h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-text-secondary hover:text-foreground",
              )}
            >
              <input
                type="radio"
                id={inputId}
                name={groupId}
                value={option.value}
                checked={checked}
                onChange={() => handleChange(option.value)}
                className="sr-only"
              />
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
