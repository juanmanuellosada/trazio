/**
 * ¿El target del evento es un campo de texto? (bloque 7.2)
 */
export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  // `target.isContentEditable` no está implementado en jsdom (siempre da
  // `false`): se chequea el atributo directamente, que además cubre
  // cualquier descendiente de la región editable (`closest`), como el
  // editor Tiptap (`.ProseMirror`).
  return target.closest('[contenteditable]:not([contenteditable="false"])') != null;
}

/**
 * Guarda de foco (bloque 7.2, requirement "Ningún atajo se dispara con el
 * foco en un campo de texto, salvo deshacer"): la guarda aplica solo a
 * **teclas sueltas**. Un atajo con modificador `Ctrl`/`Cmd` se dispara igual
 * con el foco en un campo de texto, porque ese combo no se escribe dentro
 * del campo (una letra suelta sí). `Ctrl/Cmd+Z` no pasa por acá de todos
 * modos — sigue viviendo en
 * `components/providers/undo-provider.tsx`, que ya lo dispara con el foco
 * en cualquier lado.
 */
export function isBlockedByFocusGuard(event: Pick<KeyboardEvent, "target" | "ctrlKey" | "metaKey">): boolean {
  if (event.ctrlKey || event.metaKey) return false;
  return isTextInputTarget(event.target);
}
