"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import { updateThemePreference } from "@/lib/preferences/theme-action";
import { toastError } from "@/lib/toast";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

/**
 * Submenú "Tema" del menú de cuenta del panel lateral (bloque 10.3):
 * antes era su propio menú desplegable suelto al pie del panel
 * (`AccountMenu`, `account-menu.tsx`, lo agrupa ahí junto con Configuración
 * y cerrar sesión); acá solo cambió el envoltorio — de `DropdownMenu` raíz a
 * `DropdownMenuSub`, que necesita un `DropdownMenu` ancestro (lo pone
 * `AccountMenu`). El cambio de tema, su persistencia en
 * `user_preferences.theme` y el fallback a "Sistema" antes de montar siguen
 * igual que en el bloque 5.5.
 */
export function ThemeToggle() {
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
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <ActiveIcon className="size-4 shrink-0" />
        <span>Tema: {active.label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => handleSelect(option.value)}>
            <option.icon className="size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
