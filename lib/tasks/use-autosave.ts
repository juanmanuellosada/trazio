"use client";

import { useEffect, useRef } from "react";

/**
 * Autoguardado con debounce (bloque 7.3/7.10, requirement "Título y
 * descripción se autoguardan, sin requerir una acción explícita de
 * guardado"): dispara `onSave(value)` recién `delayMs` después de que
 * `value` deja de cambiar. `flush()` guarda de inmediato lo pendiente — se
 * llama al perder el foco o al desmontar, para no perder el último tramo si
 * el debounce todavía no llegó a disparar.
 *
 * No decide qué valor mostrar mientras se edita: eso es responsabilidad de
 * quien lo usa (`task-detail-content.tsx` guarda el título/la descripción
 * en estado local, sembrado del servidor solo una vez por tarea — ver el
 * comentario ahí sobre por qué así no se pisa lo que se está escribiendo).
 */
export function useAutosave<T>(value: T, onSave: (value: T) => void, delayMs = 600) {
  const onSaveRef = useRef(onSave);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRunRef = useRef(true);

  // Mantiene la referencia a la última versión de `onSave` sin reiniciar el
  // debounce en cada render (el efecto de abajo no la lista como
  // dependencia a propósito): mutar un ref fuera de un efecto está prohibido
  // (`react-hooks/refs`), así que se actualiza acá en vez de en el cuerpo.
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    if (isFirstRunRef.current) {
      // El primer render siembra el valor inicial (viene del servidor): no
      // es una edición del usuario, no hay nada que guardar todavía.
      isFirstRunRef.current = false;
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onSaveRef.current(value), delayMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delayMs]);

  function flush(currentValue: T) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      onSaveRef.current(currentValue);
    }
  }

  return { flush };
}
