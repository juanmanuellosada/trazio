"use client";

import { LogOut } from "lucide-react";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Cierra sesión (tarea 4.16, montado en el pie del panel lateral en el
 * bloque 5). `signOut()` llama a la API de Supabase: la sesión se termina
 * en el servidor, no solo se borra algo local, y limpia las cookies del
 * cliente de navegador.
 *
 * También limpia la caché de TanStack Query: sin esto, un segundo login
 * en el mismo navegador (otra cuenta) podría mostrar por un instante datos
 * de la cuenta anterior servidos desde la caché. Requiere que el árbol
 * tenga un `QueryClientProvider` arriba (`app/(app)/layout.tsx`).
 *
 * La secuencia en sí vive en `lib/auth/use-sign-out.ts`, compartida con el
 * ítem "Cerrar sesión" de `account-menu.tsx`.
 */
export function LogoutButton({
  className,
  variant = "outline",
  collapsed = false,
}: {
  className?: string;
  variant?: "outline" | "ghost";
  collapsed?: boolean;
}) {
  const { signOut, loading } = useSignOut();

  const button = (
    <Button
      type="button"
      variant={variant}
      className={cn(className, collapsed && "w-9 justify-center px-0")}
      onClick={signOut}
      disabled={loading}
      aria-label="Cerrar sesión"
    >
      <LogOut className="size-4" />
      {!collapsed && <span>{loading ? "Cerrando sesión…" : "Cerrar sesión"}</span>}
    </Button>
  );

  if (!collapsed) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">Cerrar sesión</TooltipContent>
    </Tooltip>
  );
}
