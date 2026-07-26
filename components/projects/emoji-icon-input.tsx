import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Ícono emoji del proyecto (bloque 6.2): un campo de una sola posición, opcional. */
export function EmojiIconInput({
  registration,
  error,
}: {
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Ícono (opcional)</Label>
      <Input
        id={id}
        type="text"
        maxLength={8}
        placeholder="📦"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="h-11 w-20 text-center text-lg"
        {...registration}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
