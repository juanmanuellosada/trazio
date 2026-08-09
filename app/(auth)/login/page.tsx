import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { translateAuthErrorCode } from "@/lib/auth/errors";
import { resolveEntryPath } from "@/lib/preferences/get-default-view-path";
import { appendNext, safeNextPath } from "@/lib/safe-path";
import { getRequestHost, getSiteUrl } from "@/lib/site-url";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciá sesión — Trazio",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextParam, error: errorParam } = await searchParams;
  const next = safeNextPath(nextParam);

  // Si ya hay sesión, no mostrar el formulario de nuevo (bug: volver a la
  // app pedía iniciar sesión encima de una sesión viva). Mismo patrón que
  // `app/entrar/route.ts`.
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveEntryPath(user.id, next));
  }

  const siteUrl = getSiteUrl(getRequestHost(await headers()));
  const initialError = errorParam ? translateAuthErrorCode(errorParam) : null;

  return (
    <AuthShell
      title="Iniciá sesión"
      subtitle="Volvé a encontrar lo que tenías que hacer."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href={appendNext("/registro", next)} className="font-medium text-primary hover:underline">
            Creá una
          </Link>
        </>
      }
    >
      <LoginForm siteUrl={siteUrl} next={next} initialError={initialError} />
    </AuthShell>
  );
}
