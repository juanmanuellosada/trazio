import type { JSX } from "react";
import {
  CALENDAR_PREVIEW_BLOCKS,
  CALENDAR_PREVIEW_END_HOUR,
  CALENDAR_PREVIEW_START_HOUR,
  type CalendarPreviewBlock,
} from "@/lib/landing/calendar-preview-data";
import { cn } from "@/lib/utils";

/**
 * Preview estático del calendario para "Lo que ya está agendado"
 * (`openspec/changes/landing-para-la-vida-entera/design.md`, decisión
 * D-CAL). Server Component autocontenido: no importa nada de
 * `components/calendar/` (~30 archivos, todos "use client", con
 * `@dnd-kit`, `ResizeObserver` y `next-themes`) porque eso arrastraría el
 * bundle de la app entera a una página pública, violando la regla de que
 * la landing es enteramente servidor (`.claude/rules/frontend.md`). Todo
 * lo que necesita —constantes de grilla, forma por tipo de bloque,
 * posicionamiento— está deliberadamente duplicado acá en unas pocas
 * líneas, en vez de reutilizado. No "arreglar" esto importando del
 * calendario real: es el costo aceptado de D-CAL, no un olvido.
 *
 * Posicionamiento: cada bloque se ubica con `top`/`height` en porcentaje
 * del alto total de la franja horaria (sin `ResizeObserver`: el ancho ya
 * es 100% del contenedor por CSS, y el alto es fijo por breakpoint), así
 * que escala solo entre el alto de móvil y el de escritorio sin
 * recalcular nada en el cliente.
 *
 * Sección oscura fija (D-DARK): todos los colores de acá son valores
 * arbitrarios (`bg-[#0f172a]`, etc.), tomados literalmente de la paleta
 * `.dark` de `app/globals.css`, en vez de las utilidades semánticas
 * (`bg-background`, `text-foreground`) que sí cambian con el tema del
 * visitante. Es intencional: esta sección se ve oscura sea cual sea el
 * tema del sistema, así que atarla a `.dark` la rompería en tema claro.
 */

const START_MINUTES = CALENDAR_PREVIEW_START_HOUR * 60;
const END_MINUTES = CALENDAR_PREVIEW_END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

const HOUR_MARKS = Array.from(
  { length: CALENDAR_PREVIEW_END_HOUR - CALENDAR_PREVIEW_START_HOUR + 1 },
  (_, index) => CALENDAR_PREVIEW_START_HOUR + index,
);

/** Duración a partir de la cual un bloque muestra también su horario, no solo el título (evita texto amontonado en un bloque de 30 minutos). */
const MIN_MINUTES_FOR_TIME_LABEL = 45;

function percentFromMinutes(minutes: number): number {
  return ((minutes - START_MINUTES) / TOTAL_MINUTES) * 100;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function formatClock(minutes: number): string {
  const hour = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

/**
 * Forma por tipo de bloque, duplicada de `TYPE_SHAPE_CLASS`
 * (`components/calendar/calendar-block-chip.tsx`): tarea = caja con borde
 * grueso, hábito = píldora, evento = barra con borde izquierdo grueso. Se
 * distinguen por forma, sin leyenda de texto (design.md, sección 6).
 */
const TYPE_SHAPE_CLASS: Record<CalendarPreviewBlockType, string> = {
  task: "rounded-md border-2",
  habit: "rounded-full border",
  event: "rounded-md border-y border-r border-l-4",
};

type CalendarPreviewBlockType = CalendarPreviewBlock["type"];

export function CalendarDayPreview(): JSX.Element {
  return (
    <div
      role="img"
      aria-label="Vista de ejemplo de un día en el calendario de Trazio: una tarea, un hábito y un evento de Google Calendar en la misma grilla, entre las 8 y las 20."
      className="overflow-hidden rounded-xl border border-[#2a3547] bg-[#1a2436] p-3"
    >
      <div className="flex">
        <div aria-hidden className="relative w-10 shrink-0 text-[10px] text-[#94a3b8] sm:w-12 sm:text-xs">
          {HOUR_MARKS.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2"
              style={{ top: `${percentFromMinutes(hour * 60)}%` }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
        <div className="relative h-[480px] flex-1 border-l border-[#2a3547] pl-2 sm:h-[600px]">
          {HOUR_MARKS.map((hour) => (
            <div
              key={hour}
              aria-hidden
              className="absolute inset-x-0 border-t border-[#2a3547]"
              style={{ top: `${percentFromMinutes(hour * 60)}%` }}
            />
          ))}
          {CALENDAR_PREVIEW_BLOCKS.map((block) => {
            const durationMinutes = block.endMinutes - block.startMinutes;
            const showTime = durationMinutes >= MIN_MINUTES_FOR_TIME_LABEL;
            return (
              <div
                key={block.id}
                aria-hidden
                data-block-type={block.type}
                data-start-minutes={block.startMinutes}
                className={cn(
                  "absolute inset-x-1.5 flex flex-col justify-center overflow-hidden px-2 py-0.5 text-[10px] leading-tight text-[#f1f4f8] sm:text-xs",
                  TYPE_SHAPE_CLASS[block.type],
                )}
                style={{
                  top: `${percentFromMinutes(block.startMinutes)}%`,
                  height: `${percentFromMinutes(block.endMinutes) - percentFromMinutes(block.startMinutes)}%`,
                  borderColor: block.colorHex,
                  backgroundColor: `${block.colorHex}1a`,
                }}
              >
                <span className="truncate font-medium">{block.title}</span>
                {showTime && (
                  <span className="truncate text-[#94a3b8]">
                    {formatClock(block.startMinutes)}–{formatClock(block.endMinutes)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
