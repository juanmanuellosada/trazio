import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { translateAuthErrorCode } from "@/lib/auth/errors";
import { appendNext, safeNextPath } from "@/lib/safe-path";
import { getSiteUrl } from "@/lib/site-url";
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
  const siteUrl = getSiteUrl();
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
