import { randomUUID } from "node:crypto";

/** 8+ caracteres, como pide `lib/validation/auth.ts` (`passwordSchema`). */
export const PASSWORD = "Contrasena123";
export const PASSWORD_NUEVA = "ContrasenaNueva456";

/** Correo nuevo por test: nunca se reutiliza una cuenta entre corridas. */
export function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@trazio.test`;
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${randomUUID().slice(0, 6)}`;
}
