/**
 * Los selectores de fecha/prioridad/etc. del detalle de tarea
 * (`DateSelect`, `PrioritySelect`, `DeadlineSelect`, `ReminderPicker`,
 * `TaskDestinationSelect`, `LabelPicker`) son popovers y menús que manejan
 * su propio estado de apertura, sin una prop `open`/`onOpenChange` externa
 * (bloque 7.6): abrirlos desde un atajo de teclado clickea su propio
 * trigger en vez de sumarles esa prop a cada uno solo para este caso.
 */
export function clickFirstButton(container: HTMLElement | null): void {
  container?.querySelector("button")?.click();
}

/** Igual que `clickFirstButton`, pero por el texto visible del botón: para "Agregar subtarea" (bloque 7.6, N), que puede no ser el primer `<button>` del contenedor si ya hay subtareas listadas arriba. */
export function clickButtonByText(container: HTMLElement | null, text: string): void {
  if (!container) return;
  const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);
  button?.click();
}
