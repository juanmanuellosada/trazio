"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Cierra sesión: termina la sesión en Supabase (server-side, no solo borra
 * algo local), limpia la caché de TanStack Query —para que un segundo login
 * en el mismo navegador no muestre por un instante datos de la cuenta
 * anterior servidos desde la caché— y vuelve a la landing. Compartido por
 * `logout-button.tsx` (botón suelto del panel lateral) y `account-menu.tsx`
 * (ítem del menú desplegable), que antes duplicaban esta secuencia.
 */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/");
    router.refresh();
  }

  return { signOut, loading };
}
