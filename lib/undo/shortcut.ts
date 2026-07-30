/**
 * `Ctrl/Cmd+Z` es el único atajo de la aplicación que se dispara con el
 * foco en un campo de texto (`.claude/rules/frontend.md`, D-G). Se excluye
 * `Shift` porque `Ctrl+Shift+Z` es la combinación convencional de rehacer,
 * que esta pila no implementa — mejor no reaccionar que reaccionar mal.
 */
export function isUndoShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">): boolean {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "z";
}

/**
 * El editor Tiptap (descripción de tarea o comentario) deshace su propio
 * historial primero (requirement "Con el editor Tiptap enfocado, el editor
 * deshace su propia edición primero"): se detecta por la clase `ProseMirror`
 * que `@tiptap/react` pone en la raíz editable, sin depender de ningún
 * componente en particular — cualquier editor Tiptap de la app cae acá por
 * igual.
 */
export function isInsideTiptapEditor(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".ProseMirror") != null;
}
