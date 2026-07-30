import type { ShortcutCombo } from "./types";

/**
 * Compara un evento de teclado contra un combo (bloque 7.1). `combo.ctrl`
 * acepta `ctrlKey` o `metaKey` indistintamente (ver `types.ts`): un mismo
 * atajo funciona igual en Windows/Linux y en Mac.
 */
export function matchesCombo(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">, combo: ShortcutCombo): boolean {
  const mod = event.ctrlKey || event.metaKey;
  if ((combo.ctrl ?? false) !== mod) return false;
  if ((combo.shift ?? false) !== event.shiftKey) return false;
  if ((combo.alt ?? false) !== event.altKey) return false;
  return event.key.toLowerCase() === combo.key.toLowerCase();
}
