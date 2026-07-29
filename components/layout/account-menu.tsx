"use client";

import { useRouter } from "next/navigation";
import { LogOut, MoreVertical, Settings, Tag } from "lucide-react";
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
  const router = useRouter();
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
        <DropdownMenuItem onClick={openSettings}>
          <Settings className="size-4" />
          Configuración
        </DropdownMenuItem>
        {/* "Etiquetas" (bloque 4.5, `administracion-de-etiquetas`): el
            requirement de fase 1 protege la lista PRINCIPAL de navegación
            (Bandeja/Hoy/Completado + árbol de proyectos, en
            `sidebar-content.tsx`) de un ítem "Etiquetas" — ese ítem llevaría
            a la página propia por etiqueta, que todavía no existe. La
            pantalla de administración que sí se suma acá no es esa página,
            así que entra donde ya vive "Configuración": otro destino que
            tampoco pertenece a esa lista principal. */}
        <DropdownMenuItem onClick={() => router.push("/etiquetas")}>
          <Tag className="size-4" />
          Etiquetas
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={loggingOut}>
          <LogOut className="size-4" />
          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
