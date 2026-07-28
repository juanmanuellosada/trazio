"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserIdentity } from "@supabase/supabase-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { profileNameSchema, type ProfileNameInput } from "@/lib/validation/preferences";
import { useUpdateProfileName, useUnlinkGoogle } from "@/lib/preferences/mutations";
import { translateAuthError } from "@/lib/auth/errors";
import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordSection } from "./password-section";

/**
 * Sección Cuenta (bloque 9.4, spec `configuracion` §"Sección Cuenta",
 * renombrada de "Perfil"): nombre editable, correo de solo lectura, el
 * formulario de contraseña (`password-section.tsx`, cuya forma cambia según
 * si la cuenta ya tiene una) y, si el acceso se hizo con Google, la opción
 * de desvincularlo.
 *
 * No hay ningún flujo para *vincular* Google a una cuenta de correo y
 * contraseña (OQ4, decisión tomada): eso trae casos de borde propios
 * —correo que no coincide, otra cuenta con ese correo— que quedan fuera de
 * este cambio.
 */
export function AccountSection({
  userId,
  fullName,
  email,
  hasPassword,
  googleIdentity,
}: {
  userId: string;
  fullName: string | null;
  email: string | null;
  hasPassword: boolean;
  googleIdentity: UserIdentity | null;
}) {
  const nameId = useId();
  const router = useRouter();
  const updateName = useUpdateProfileName();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileNameInput>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: fullName ?? "" },
  });

  async function onSubmit(values: ProfileNameInput) {
    await updateName.mutateAsync({ userId, name: values.name });
    router.refresh();
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Cuenta</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={nameId}>Nombre</Label>
          <Input
            id={nameId}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            className="h-11 max-w-sm text-base"
            {...register("name")}
          />
          {errors.name ? (
            <p id={`${nameId}-error`} role="alert" className="text-sm text-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">Correo</span>
          <p className="max-w-sm text-base text-text-secondary">{email ?? "—"}</p>
        </div>

        <Button type="submit" disabled={updateName.isPending}>
          {updateName.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>

      <div className="border-t border-border pt-6">
        <PasswordSection email={email} hasPassword={hasPassword} />
      </div>

      {googleIdentity ? <GoogleSection identity={googleIdentity} canUnlink={hasPassword} /> : null}
    </section>
  );
}

/**
 * Vinculación con Google: solo se ofrece desvincular cuando `hasPassword`
 * es `true` — si Google fuera el único método de acceso, desvincularlo
 * dejaría la cuenta sin forma de entrar. En ese caso se explica por qué la
 * acción no está disponible en vez de mostrarla inerte (mismo criterio de
 * D7 que decide qué secciones aparecen).
 */
function GoogleSection({ identity, canUnlink }: { identity: UserIdentity; canUnlink: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const unlinkGoogle = useUnlinkGoogle();

  async function handleConfirm() {
    setConfirmOpen(false);
    setServerError(null);
    try {
      await unlinkGoogle.mutateAsync(identity);
    } catch (error) {
      setServerError(translateAuthError(error));
    }
  }

  return (
    <div className="max-w-sm space-y-3 border-t border-border pt-6">
      <h3 className="text-sm font-medium text-foreground">Google</h3>
      <p className="text-sm text-text-secondary">Tu cuenta está vinculada con Google.</p>
      {serverError ? <AuthErrorBanner message={serverError} /> : null}

      {canUnlink ? (
        <Button type="button" variant="outline" disabled={unlinkGoogle.isPending} onClick={() => setConfirmOpen(true)}>
          {unlinkGoogle.isPending ? "Desvinculando…" : "Desvincular Google"}
        </Button>
      ) : (
        <p className="text-sm text-text-secondary">
          Es tu única forma de entrar a la cuenta. Para desvincularla, definí antes una contraseña.
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Desvincular Google?"
        description="Vas a dejar de poder entrar con tu cuenta de Google. Seguís entrando con tu correo y contraseña."
        confirmLabel="Desvincular"
        onConfirm={handleConfirm}
      />
    </div>
  );
}
