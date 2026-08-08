"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Medidas compartidas entre `all-day-row.tsx` y `time-grid.tsx`, unificadas
 * desde la tarea 1.3 en un único contenedor con desplazamiento (`time-grid.tsx`
 * dibuja las dos), así que ya no hace falta que coincidan solas: comparten
 * el mismo `grid-template-columns`.
 */
export const GUTTER_WIDTH_PX = 56;
/**
 * Ancho de columna antes de la primera medición del contenedor (tarea 2.1):
 * ya no es un mínimo que se respete siempre —eso rompía la promesa de "ver
 * exactamente N días" en pantallas angostas (`design.md`, decisión 2)—, solo
 * el valor de arranque hasta que `ResizeObserver` reporta el ancho real.
 */
export const DAY_COLUMN_MIN_WIDTH_PX = 112;
/**
 * Pedido del dueño ("todavía me parece muy angosto las tareas de 15 min"):
 * subida de 48 a 72 (commit anterior) no alcanzó. 96 no es arbitrario: a
 * 96px/hora, un bloque de 15 minutos mide 24px, exactamente
 * `TIGHT_HEIGHT_THRESHOLD_PX` de `calendar-block-chip.tsx` — el bloque de
 * 15 minutos del paso mínimo de la grilla deja de caer en modo apretado
 * (`isTight`) y pasa a mostrarse con el padding y la tipografía normales.
 * Costo: el día pasa de 1728px a 2304px de alto, el doble del original
 * (48px/hora).
 */
export const HOUR_ROW_HEIGHT_PX = 96;
export const HEADER_ROW_HEIGHT_PX = 32;
export const GRID_HEIGHT_PX = HOUR_ROW_HEIGHT_PX * 24;

/** Nombre de la variable CSS que publica el ancho de columna medido (tarea 2.1), para que cualquier descendiente del contenedor la lea con `var(...)` sin volver a medir nada. */
export const COLUMN_WIDTH_CSS_VAR = "--calendar-column-width";

/**
 * Margen de columnas montadas a cada lado de lo visible (tarea 4.2): medido
 * antes de elegirlo, no al revés — `TimeGrid` con columnas vacías no sirve
 * de nada para esto, así que se armó un banco descartable que montaba la
 * grilla con columnas llenas de 15 bloques cada una (el caso denso, no el
 * vacío) y cronometró `performance.now()` alrededor del render, de 7 a 31
 * columnas mostradas a la vez. El costo por columna resultó chico frente al
 * costo fijo de montar la grilla (de 7 a 31 columnas —cuatro veces más— el
 * tiempo total apenas creció ~1.7x), así que un margen de una semana a cada
 * lado —el peor caso, formato semana, monta 21 columnas a la vez— queda
 * lejos de cualquier costo notorio. Una semana también alcanza para que un
 * arrastre hacia el borde (grupo 7) y el desplazamiento por inercia en
 * táctil (grupo 8) encuentren columnas ya montadas en vez de un hueco vacío
 * mientras el próximo tramo de datos llega.
 */
export const COLUMN_VIRTUALIZATION_MARGIN_DAYS = 7;

/**
 * Ancho de columna medido, no repartido (tarea 2.1/2.2, `design.md` decisión
 * 2): con desplazamiento horizontal, `1fr` reparte el ancho sobre el
 * contenido entero, no sobre lo que se ve, así que hay que medir el ancho
 * visible del contenedor con `ResizeObserver` y calcular
 * `(ancho − GUTTER_WIDTH_PX) / cantidadDeDías` a mano. Devuelve el `ref` para
 * poner en el contenedor con desplazamiento y el ancho de columna en píxeles
 * (el valor de arranque antes de la primera medición, incluido en SSR donde
 * no hay `ResizeObserver`).
 */
export function useMeasuredColumnWidthPx(dayCount: number): [React.RefObject<HTMLDivElement | null>, number] {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    setContainerWidth(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const columnWidthPx = containerWidth > 0 ? (containerWidth - GUTTER_WIDTH_PX) / dayCount : DAY_COLUMN_MIN_WIDTH_PX;
  return [containerRef, columnWidthPx];
}

/** `grid-template-columns` de la grilla unificada (tarea 1.3/2.2): la columna de horas más una por día, todas con el ancho medido publicado en `COLUMN_WIDTH_CSS_VAR`. */
export function dayColumnsTemplate(dayCount: number): string {
  return `${GUTTER_WIDTH_PX}px repeat(${dayCount}, var(${COLUMN_WIDTH_CSS_VAR}))`;
}
