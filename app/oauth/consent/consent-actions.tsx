"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";

type Decision = "approve" | "deny";

/**
 * Isla cliente de la pantalla de consentimiento (tarea 5.3): aprobar y
 * rechazar necesitan interacción, todo lo demás alrededor es servidor. Sin
 * `skipBrowserRedirect`, el propio SDK manda el navegador al `redirect_url`
 * del cliente OAuth cuando la respuesta llega bien — mismo patrón que
 * `GoogleAuthButton` con `signInWithOAuth`, no hay que armar la navegación
 * a mano.
 */
export function ConsentActions({ authorizationId }: { authorizationId: string }) {
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(decision: Decision) {
    setError(null);
    setPending(decision);
    const supabase = createClient();
    const { error: authError } =
      decision === "approve"
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);

    if (authError) {
      setError(
        decision === "approve"
          ? "No pudimos aprobar la conexión porque se cortó la comunicación con el servidor. Revisá tu internet y volvé a intentar."
          : "No pudimos rechazar la conexión porque se cortó la comunicación con el servidor. Revisá tu internet y volvé a intentar.",
      );
      setPending(null);
    }
    // Sin error, el navegador ya está saliendo hacia el `redirect_url`.
  }

  return (
    <div className="space-y-3">
      {error ? <AuthErrorBanner message={error} /> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-11 flex-1 text-base"
          onClick={() => handle("approve")}
          disabled={pending !== null}
        >
          {pending === "approve" ? "Aprobando…" : "Aprobar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-base"
          onClick={() => handle("deny")}
          disabled={pending !== null}
        >
          {pending === "deny" ? "Rechazando…" : "Rechazar"}
        </Button>
      </div>
    </div>
  );
}
