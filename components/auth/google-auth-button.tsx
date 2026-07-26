"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";

interface GoogleAuthButtonProps {
  /** Resuelto en el servidor con `lib/site-url.ts` (tarea 4.7): nunca hardcodeado,
   * porque `VERCEL_URL` no está disponible en el bundle del navegador. */
  siteUrl: string;
  /** Destino a donde volver después de autenticar, propagado al callback. */
  next: string;
}

/** Botón de "Continuar con Google", compartido por registro y login. */
export function GoogleAuthButton({ siteUrl, next }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError("No pudimos abrir la ventana de Google porque se cortó la conexión. Revisá tu internet y volvé a intentar.");
      setLoading(false);
    }
    // Sin error, el propio cliente redirige el navegador a Google.
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full text-base"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Abriendo Google…" : "Continuar con Google"}
      </Button>
      {error ? <AuthErrorBanner message={error} /> : null}
    </div>
  );
}
