"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";

export function LoginForm({
  siteUrl,
  next,
  initialError,
}: {
  siteUrl: string;
  next: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(initialError);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await loginAction(values, next);
    if (!result.success) {
      setServerError(result.message);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GoogleAuthButton siteUrl={siteUrl} next={next} />
      <div className="flex items-center gap-3 text-xs text-text-secondary" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        o
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError ? <AuthErrorBanner message={serverError} /> : null}
        <TextField
          label="Correo"
          type="email"
          registration={register("email")}
          error={errors.email?.message}
          autoComplete="email"
        />
        <PasswordField
          label="Contraseña"
          registration={register("password")}
          error={errors.password?.message}
          autoComplete="current-password"
        />
        <div className="text-right text-sm">
          <Link href="/recuperar-contrasena" className="text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
          {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}
