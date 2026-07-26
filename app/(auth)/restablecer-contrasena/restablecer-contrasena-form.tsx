"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { resetPasswordAction } from "./actions";

export function RestablecerContrasenaForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const result = await resetPasswordAction(values);
    if (!result.success) {
      setServerError(result.message);
      return;
    }
    router.push("/bandeja");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError ? <AuthErrorBanner message={serverError} /> : null}
      <PasswordField
        label="Contraseña nueva"
        registration={register("password")}
        error={errors.password?.message}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirmar contraseña"
        registration={register("confirmPassword")}
        error={errors.confirmPassword?.message}
        autoComplete="new-password"
      />
      <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
