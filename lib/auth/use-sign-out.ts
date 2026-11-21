"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { unsubscribeFromPush } from "@/lib/reminders/subscribe";

/**
 * Cierra sesión: termina la sesión en Supabase (server-side, no solo borra
 * algo local), limpia la caché de TanStack Query —para que un segundo login
 * en el mismo navegador no muestre por un instante datos de la cuenta
 * anterior servidos desde la caché— y vuelve a la landing. Compartido por
 * `logout-button.tsx` (botón suelto del panel lateral) y `account-menu.tsx`
 * (ítem del menú desplegable), que antes duplicaban esta secuencia.
 *
 * Antes de cerrar la sesión da de baja la suscripción push de este
 * navegador (el borrado de la fila necesita la sesión): si no, los
 * recordatorios de la cuenta que salió seguirían llegando acá. Es de mejor
 * esfuerzo: un navegador sin push o una falla nunca impiden cerrar sesión.
 */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await unsubscribeFromPush();
    } catch {
      // Mejor esfuerzo: no bloquea el cierre de sesión.
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/");
    router.refresh();
  }

  return { signOut, loading };
}
