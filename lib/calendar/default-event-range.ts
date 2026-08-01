/**
 * Rango inicial para un alta de evento sin selección previa (bloque 7.5/7.6):
 * el atajo `E` y el acceso "agregar evento" del panel lateral abren
 * `CreateEventDialog` sin que nadie haya arrastrado un rango en la grilla, a
 * diferencia de `components/calendar/calendar-view.tsx` (tarea 6.7). Se
 * arranca en la próxima media hora redonda, con una hora de duración —mismo
 * criterio de "default razonable, ajustable después" que
 * `DEFAULT_UNTIMED_DURATION_MINUTES` de esa vista.
 */
export function defaultEventRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30);
  return { start, end: new Date(start.getTime() + 60 * 60 * 1000) };
}
