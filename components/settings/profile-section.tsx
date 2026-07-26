"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { profileNameSchema, type ProfileNameInput } from "@/lib/validation/preferences";
import { useUpdateProfileName } from "@/lib/preferences/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordSection } from "./password-section";

/**
 * Sección Perfil (tarea 11.2): nombre editable, correo de solo lectura (no
 * es un `<input>` para no insinuar que se puede tocar) y el formulario de
 * contraseña, que vive en `password-section.tsx` porque su forma cambia
 * según si la cuenta ya tiene contraseña.
 */
export function ProfileSection({
  userId,
  fullName,
  email,
  hasPassword,
}: {
  userId: string;
  fullName: string | null;
  email: string | null;
  hasPassword: boolean;
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
    <section className="space-y-6 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Perfil</h2>

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
    </section>
  );
}
