"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { requestPasswordResetSchema, type RequestPasswordResetInput } from "@/lib/validation/auth";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "./actions";

export function RecuperarContrasenaForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  async function onSubmit(values: RequestPasswordResetInput) {
    setServerError(null);
    const result = await requestPasswordResetAction(values);
    if (!result.success) {
      setServerError(result.message);
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-center">
        <p className="text-base font-medium text-foreground">Revisá tu correo</p>
        <p className="text-sm text-text-secondary">
          Si <strong>{sentTo}</strong> tiene una cuenta en Trazio, te mandamos un enlace para
          elegir una contraseña nueva.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError ? <AuthErrorBanner message={serverError} /> : null}
      <TextField
        label="Correo"
        type="email"
        registration={register("email")}
        error={errors.email?.message}
        autoComplete="email"
      />
      <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
