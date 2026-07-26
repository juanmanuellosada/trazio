"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cierra sesión (tarea 4.16). `signOut()` llama a la API de Supabase: la
 * sesión se termina en el servidor, no solo se borra algo local, y limpia
 * las cookies del cliente de navegador. Después redirige a la landing.
 *
 * La caché de TanStack Query se suma a este mismo botón cuando el bloque 5
 * agregue el `QueryClientProvider`: hoy no existe ninguna caché que limpiar,
 * y llamar a `useQueryClient()` sin ese provider en el árbol rompería.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(className)}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
