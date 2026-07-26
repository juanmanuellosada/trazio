"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordField } from "@/components/auth/password-field";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { registerAction } from "./actions";

export function RegistroForm({ siteUrl, next }: { siteUrl: string; next: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction(values);
    if (!result.success) {
      setServerError(result.message);
      return;
    }
    if (result.needsConfirmation) {
      setConfirmedEmail(values.email);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  if (confirmedEmail) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-center">
        <p className="text-base font-medium text-foreground">Revisá tu correo</p>
        <p className="text-sm text-text-secondary">
          Te mandamos un enlace de confirmación a <strong>{confirmedEmail}</strong>. Abrilo para
          activar tu cuenta y poder iniciar sesión.
        </p>
      </div>
    );
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
          label="Nombre"
          registration={register("name")}
          error={errors.name?.message}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />
        <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </div>
  );
}
