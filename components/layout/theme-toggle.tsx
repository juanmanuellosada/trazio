"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { updateThemePreference } from "@/lib/preferences/theme-action";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

/**
 * Selector de tema del pie del panel lateral (bloque 5.5). El cambio se ve
 * al instante vía `next-themes` (`setTheme`); la persistencia en
 * `user_preferences.theme` es la que permite que otro dispositivo herede
 * la preferencia en su primer ingreso.
 */
export function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  // `theme` se lee de `localStorage` de forma síncrona en el cliente desde
  // el primer render, antes de montar — puede no coincidir con lo que
  // asumió el servidor. Hasta montar, mostrar siempre "Sistema" (la opción
  // por defecto) en vez de adivinar.
  const active = mounted ? (OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]) : OPTIONS[2];
  const ActiveIcon = active.icon;

  async function handleSelect(value: (typeof OPTIONS)[number]["value"]) {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cambiar tema"
        title={collapsed ? "Cambiar tema" : undefined}
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-text-secondary outline-none hover:bg-surface hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          collapsed ? "w-9 justify-center px-0" : "w-full",
        )}
      >
        <ActiveIcon className="size-4 shrink-0" />
        {!collapsed && <span>Tema: {active.label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => handleSelect(option.value)}>
            <option.icon className="size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
