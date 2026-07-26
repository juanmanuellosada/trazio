import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { appendNext, safeNextPath } from "@/lib/safe-path";
import { getSiteUrl } from "@/lib/site-url";
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
  const siteUrl = getSiteUrl();

  return (
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
  );
}
