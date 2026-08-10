import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { loginRedirectPath } from "@/lib/supabase/login-redirect-path";
import { ConsentActions } from "./consent-actions";

export const metadata: Metadata = {
  title: "Autorizar acceso — Trazio",
};

/**
 * Pantalla de consentimiento del servidor OAuth de Supabase
 * (`consentimiento-oauth`, tarea 5.1, D-B de `design.md` de `servidor-mcp`):
 * el endpoint de autorización redirige acá con `?authorization_id=...`
 * (`authorization_url_path` en `supabase/config.toml`, mismo origen que el
 * Site URL del proyecto, requisito del servidor hospedado). Fuera de
 * `app/(app)/` a propósito, igual que `app/enlace/[token]/`: es una pantalla
 * de decisión puntual, no un lugar donde navegar, así que no hereda el
 * panel lateral ni la navegación de la app privada.
 *
 * El GET a `getAuthorizationDetails` no es solo para mostrar la pantalla:
 * el POST que aprueba o rechaza (`ConsentActions`) devuelve 404
 * `authorization_not_found` si no hubo un GET antes para ese
 * `authorization_id`, verificado contra el stack local
 * (`supabase/tests/oauth.ts`). Como esta pantalla siempre hace el GET para
 * poder renderizar, ese requisito sale gratis.
 */
export default async function OauthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId) {
    return (
      <ConsentError message="No pudimos mostrar esta conexión porque falta un dato en el enlace. Volvé a la aplicación que querés conectar e iniciá la conexión de nuevo." />
    );
  }

  // Necesita sesión iniciada para poder aprobar o rechazar en nombre de esa
  // cuenta. Si no hay una, se vuelve acá después de iniciar sesión —
  // conservando `authorization_id`, porque sin él el flujo se corta y quien
  // conecta tiene que empezar de nuevo desde el asistente (mismo patrón que
  // `app/(app)/layout.tsx` con `loginRedirectPath`).
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginRedirectPath(`/oauth/consent?authorization_id=${authorizationId}`));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error) {
    const message = isAuthRetryableFetchError(error)
      ? "No pudimos mostrar esta conexión porque se cortó la conexión. Revisá tu internet y volvé a intentar."
      : "Esta solicitud de conexión ya no es válida porque venció o no existe. Volvé a la aplicación que querés conectar e iniciá la conexión de nuevo.";
    return <ConsentError message={message} />;
  }

  // El usuario ya había aprobado este cliente antes: el servidor no pide
  // consentimiento de nuevo, devuelve directo el `redirect_url` con el
  // código (caso verificado en `supabase/tests/oauth.ts`). `redirect()` de
  // Next.js acepta URLs externas, así que manda el navegador directo al
  // cliente OAuth sin mostrar esta pantalla.
  if ("redirect_url" in data) {
    redirect(data.redirect_url);
  }

  return (
    <AuthShell
      title="Autorizar acceso a tu cuenta"
      subtitle={`${data.client.name} quiere conectarse a tu cuenta de Trazio.`}
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="space-y-1.5 text-text-secondary">
            <p className="font-medium text-foreground">
              Esta aplicación va a poder leer y modificar tu cuenta.
            </p>
            <p>
              Va a poder leer tus tareas, hábitos, proyectos, etiquetas y filtros, y crear, editar,
              completar y archivar lo que corresponda.
            </p>
            <p>No va a poder borrar nada: eso lo impide la base de datos, no solo la aplicación.</p>
            <p>Podés revocar el acceso cuando quieras desde Configuración → Aplicaciones conectadas.</p>
          </div>
        </div>
        <ConsentActions authorizationId={authorizationId} />
      </div>
    </AuthShell>
  );
}

function ConsentError({ message }: { message: string }) {
  return (
    <AuthShell title="No pudimos mostrar esta conexión">
      <AuthErrorBanner message={message} />
    </AuthShell>
  );
}
