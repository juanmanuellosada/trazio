import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { buttonVariants } from "@/components/ui/button";
import { translateAuthErrorCode } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { RestablecerContrasenaForm } from "./restablecer-contrasena-form";

export const metadata: Metadata = {
  title: "Restablecer contraseña — Trazio",
};

/**
 * Ojo con el token (tarea 4.15c): no llega como parámetro que se lea y ya,
 * sino que el callback compartido (`app/(auth)/callback/route.ts`) ya lo
 * intercambió por una sesión antes de traer a la persona acá. Esta pantalla
 * solo valida que esa sesión exista; si no, el enlace venció o ya se usó.
 */
export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims);

  if (errorParam === "token" || !hasSession) {
    return (
      <AuthShell title="El enlace ya no sirve">
        <div className="space-y-4">
          <AuthErrorBanner message={translateAuthErrorCode("token")} />
          <Link
            href="/recuperar-contrasena"
            className={cn(buttonVariants({ variant: "default" }), "h-11 w-full text-base")}
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Elegí tu contraseña nueva"
      subtitle="Después de guardarla, quedás con sesión iniciada."
    >
      <RestablecerContrasenaForm />
    </AuthShell>
  );
}
