"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  changePasswordSchema,
  setPasswordSchema,
  type ChangePasswordInput,
  type SetPasswordInput,
} from "@/lib/validation/preferences";
import { useChangePassword } from "@/lib/preferences/mutations";
import { translateAuthError } from "@/lib/auth/errors";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toast";

/**
 * Formulario de contraseña (tarea 11.2), en dos formas según
 * `hasPassword`: una cuenta que entró con Google y todavía no tiene
 * contraseña propia solo ve "contraseña nueva" y "confirmar" — pedirle una
 * "contraseña actual" que nunca existió sería un error confuso. Una cuenta
 * que ya tiene contraseña ve además "contraseña actual", para reautenticar
 * antes de cambiarla.
 *
 * `hasPassword` es estado local, no solo el prop inicial: si alguien
 * establece su primera contraseña acá mismo, el próximo cambio en la misma
 * sesión ya tiene que pedir la actual, sin depender de un refresh de
 * página.
 */
export function PasswordSection({ email, hasPassword: initialHasPassword }: { email: string | null; hasPassword: boolean }) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);

  return (
    <div className="max-w-sm space-y-3">
      <h3 className="text-sm font-medium text-foreground">Contraseña</h3>
      {hasPassword ? (
        <ChangePasswordForm email={email} />
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            Iniciaste sesión con Google, así que todavía no tenés una contraseña. Si querés, definí una para poder
            entrar también con tu correo.
          </p>
          <SetPasswordForm onSuccess={() => setHasPassword(true)} />
        </>
      )}
    </div>
  );
}

function SetPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetPasswordInput>({ resolver: zodResolver(setPasswordSchema) });

  async function onSubmit(values: SetPasswordInput) {
    setServerError(null);
    try {
      await changePassword.mutateAsync({ email: null, password: values.password });
      toastSuccess("Ya podés iniciar sesión con tu correo y esta contraseña.");
      reset();
      onSuccess();
    } catch (error) {
      setServerError(translateAuthError(error));
    }
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
      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? "Guardando…" : "Definir contraseña"}
      </Button>
    </form>
  );
}

function ChangePasswordForm({ email }: { email: string | null }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    try {
      await changePassword.mutateAsync({
        email,
        currentPassword: values.currentPassword,
        password: values.password,
      });
      toastSuccess("Tu contraseña se actualizó.");
      reset();
    } catch (error) {
      setServerError(translateAuthError(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError ? <AuthErrorBanner message={serverError} /> : null}
      <PasswordField
        label="Contraseña actual"
        registration={register("currentPassword")}
        error={errors.currentPassword?.message}
        autoComplete="current-password"
      />
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
      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
