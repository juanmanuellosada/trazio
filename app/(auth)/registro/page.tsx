import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { AuthShell } from "@/components/auth/auth-shell";
import { resolveEntryPath } from "@/lib/preferences/get-default-view-path";
import { appendNext, safeNextPath } from "@/lib/safe-path";
import { getRequestHost, getSiteUrl } from "@/lib/site-url";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = {
  title: "Creá tu cuenta — Trazio",
};

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam);

  // Si ya hay sesión, no mostrar el formulario de registro (mismo bug y
  // mismo arreglo que `app/(auth)/login/page.tsx`).
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveEntryPath(user.id, next));
  }

  const siteUrl = getSiteUrl(getRequestHost(await headers()));

  return (
    <>
      <AuthShell
        title="Creá tu cuenta"
        subtitle="Organizá tu día completo en una sola pantalla."
        footer={
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href={appendNext("/login", next)} className="font-medium text-primary hover:underline">
              Iniciá sesión
            </Link>
          </>
        }
      >
        <RegistroForm siteUrl={siteUrl} next={next} />
      </AuthShell>
      {/* Solo esta página monta el script (bloque 12.12): "registros completados" es la
          única de las cuatro métricas de la landing que no ocurre en app/(marketing)/. */}
      <Analytics />
    </>
  );
}
