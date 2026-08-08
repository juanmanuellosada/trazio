"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONTINUOUS_RANGE_DAYS,
  TOTAL_CONTINUOUS_DAYS,
  continuousColumnIndex,
  dateAtOffsetFromToday,
  dayOffsetFromToday,
} from "@/lib/calendar/layout";
import { COLUMN_VIRTUALIZATION_MARGIN_DAYS } from "./grid-metrics";

/** Ventana de columnas a montar (tarea 4.1), 0-based dentro de `TOTAL_CONTINUOUS_DAYS`, con hoy en el medio. Ambos extremos inclusive. */
export type MountedWindow = { startIndex: number; endIndex: number };

function windowAround(centerIndex: number, dayCount: number): MountedWindow {
  return {
    startIndex: Math.max(0, centerIndex - COLUMN_VIRTUALIZATION_MARGIN_DAYS),
    endIndex: Math.min(TOTAL_CONTINUOUS_DAYS - 1, centerIndex + dayCount - 1 + COLUMN_VIRTUALIZATION_MARGIN_DAYS),
  };
}

/**
 * Posición del desplazamiento continuo y ventana de columnas a montar
 * (tareas 4.1 y 6, `design.md` decisiones 1/3/5): el contenedor con
 * `overflow-x` (el mismo que mide `useMeasuredColumnWidthPx`) es la única
 * fuente de verdad de "qué tan corrido está" — arrastrarlo o soltarlo con
 * el dedo mueve `scrollLeft` de forma nativa, y este hook lo traduce a un
 * día (columna 0-based dentro de `TOTAL_CONTINUOUS_DAYS`, hoy en el medio)
 * y lo reporta hacia arriba (`onVisibleRangeChange`) para que quien pide
 * los datos y el resto de la interfaz se mantengan de acuerdo con lo que
 * se ve. Un cambio externo de `startDate` (botones de `CalendarNav`, "Hoy",
 * cambiar de formato) hace el camino inverso: mueve `scrollLeft` con
 * `scrollTo`.
 *
 * Para no pelearse con el propio scroll del usuario (el riesgo que
 * `design.md` marca como conocido: "reposicionar `scrollLeft` pelea con la
 * inercia táctil"), se distingue un cambio de `startDate` que ya se había
 * reportado desde acá mismo (eco del propio scroll: se ignora) de uno que
 * vino de afuera (se anima con `scrollTo`, salvo el primer montaje, que
 * salta directo sin animación).
 */
export function useContinuousScroll({
  containerRef,
  today,
  startDate,
  dayCount,
  columnWidthPx,
  onVisibleRangeChange,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  today: string;
  startDate: string;
  dayCount: number;
  columnWidthPx: number;
  onVisibleRangeChange?: (startDate: string) => void;
}): MountedWindow {
  const [mounted, setMounted] = useState<MountedWindow>(() => windowAround(continuousColumnIndex(startDate, today), dayCount));

  const lastReportedOffsetRef = useRef<number | null>(null);
  const previousColumnWidthRef = useRef<number | null>(null);
  const onVisibleRangeChangeRef = useRef(onVisibleRangeChange);
  useEffect(() => {
    onVisibleRangeChangeRef.current = onVisibleRangeChange;
  });

  // Nav externa ("Hoy", anterior/siguiente, cambiar de formato) o cambio de
  // ancho medido: repara `scrollLeft` para que siga representando `startDate`.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || columnWidthPx <= 0) return;

    const externalOffset = dayOffsetFromToday(startDate, today);
    const widthChanged = previousColumnWidthRef.current !== columnWidthPx;
    previousColumnWidthRef.current = columnWidthPx;
    const offsetChanged = lastReportedOffsetRef.current !== externalOffset;
    if (!widthChanged && !offsetChanged) return;

    const targetIndex = continuousColumnIndex(startDate, today);
    const behavior: ScrollBehavior = offsetChanged && lastReportedOffsetRef.current !== null ? "smooth" : "auto";
    container.scrollTo({ left: targetIndex * columnWidthPx, behavior });
    lastReportedOffsetRef.current = externalOffset;
    setMounted(windowAround(targetIndex, dayCount));
  }, [containerRef, startDate, today, columnWidthPx, dayCount]);

  // Desplazamiento nativo del usuario (arrastre, rueda, inercia táctil): lee
  // `scrollLeft` y reporta el nuevo día inicial hacia arriba.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    function handleScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!container || columnWidthPx <= 0) return;
        const rawIndex = Math.round(container.scrollLeft / columnWidthPx);
        const maxIndex = Math.max(TOTAL_CONTINUOUS_DAYS - dayCount, 0);
        const clampedIndex = Math.min(Math.max(rawIndex, 0), maxIndex);
        const newOffset = clampedIndex - CONTINUOUS_RANGE_DAYS;
        if (newOffset === lastReportedOffsetRef.current) return;
        lastReportedOffsetRef.current = newOffset;
        setMounted(windowAround(clampedIndex, dayCount));
        onVisibleRangeChangeRef.current?.(dateAtOffsetFromToday(newOffset, today));
      });
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [containerRef, columnWidthPx, dayCount, today]);

  return mounted;
}
