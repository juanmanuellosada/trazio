"use client";

import { LogOut, MoreVertical, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/components/settings/settings-context";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

/**
 * Menú de cuenta del pie del panel lateral (bloque 10.3): agrupa cambiar
 * tema (submenú "Tema" de `theme-toggle.tsx`), Configuración y cerrar
 * sesión en un solo desplegable, en vez de mostrarlos sueltos uno debajo
 * del otro como antes. `MoreVertical` como ícono del disparador es a
 * propósito distinto del `Settings` que ya usa el ítem "Configuración" de
 * adentro — dos íconos repetidos en la misma superficie con significados
 * distintos confunden más de lo que ayudan.
 *
 * "Configuración" abre el modal de configuración vía `useSettings()` en
 * vez de navegar a `/configuracion` (mismo patrón que `useTaskDetail()`
 * para el detalle de tarea): la ruta sigue existiendo solo como
 * compatibilidad para enlaces o marcadores viejos.
 *
 * "Cerrar sesión" usa `useSignOut()` (`lib/auth/use-sign-out.ts`), la misma
 * secuencia que `components/auth/logout-button.tsx`, en vez de reimplementarla
 * acá: `LogoutButton` no reenvía props ni `ref` a su `<button>` interno, así
 * que envolverlo en `DropdownMenuItem` —que necesita fusionar su propio rol
 * de `menuitem`, foco y cierre-al-activar sobre lo que le pasan— perdería
 * esos atributos en silencio.
 */
export function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const { open: openSettings } = useSettings();
  const { signOut, loading: loggingOut } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de cuenta"
        title={collapsed ? "Cuenta" : undefined}
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-text-secondary outline-none hover:bg-surface hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          collapsed ? "w-9 justify-center px-0" : "w-full",
        )}
      >
        <MoreVertical className="size-4 shrink-0" />
        {!collapsed && <span>Cuenta</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <ThemeToggle />
        <DropdownMenuItem onClick={() => openSettings()}>
          <Settings className="size-4" />
          Configuración
        </DropdownMenuItem>
        {/* "Etiquetas" salió de acá (`etiquetas-con-lugar-propio`, D-E): la
            administración de etiquetas ahora se alcanza desde el ítem
            principal del panel lateral (`sidebar-content.tsx`) y desde `G E`,
            no desde este menú que ni siquiera habla de etiquetas. */}
        {/* "Filtros" salió de acá (`filtros-alcanzables`, D-C): mismo caso
            que "Etiquetas" antes de moverse — ahora tiene su propio acceso
            principal en `sidebar-content.tsx` y `G F`, así que este enlace
            enterrado, en un menú de tema, configuración y cerrar sesión,
            sobraba. */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={loggingOut}>
          <LogOut className="size-4" />
          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
