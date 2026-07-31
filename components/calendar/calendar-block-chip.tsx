"use client";

import type { CSSProperties } from "react";
import { CalendarDays, Repeat, SquareCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarBlock, CalendarBlockType } from "@/lib/calendar/block";

const TYPE_ICON: Record<CalendarBlockType, typeof CalendarDays> = {
  task: SquareCheck,
  habit: Repeat,
  event: CalendarDays,
};

/**
 * Forma por tipo (tarea 5.5, requirement "se distinguen por forma, no
 * solo por color"): el color de un bloque ya está tomado por el proyecto,
 * la etiqueta o el calendario de origen, así que la distinción de tipo
 * viene del borde y del ícono, no del color. Tarea: caja con borde
 * completo. Hábito: píldora. Evento: barra lateral gruesa, como en Google
 * Calendar.
 */
const TYPE_SHAPE_CLASS: Record<CalendarBlockType, string> = {
  task: "rounded-md border-2",
  habit: "rounded-full border",
  event: "rounded-md border-y border-r border-l-4",
};

type CalendarBlockChipVariant = "timed" | "bar" | "compact";

const VARIANT_CLASS: Record<CalendarBlockChipVariant, string> = {
  timed: "h-full w-full flex-col items-start justify-start gap-0 px-1.5 py-1 text-left",
  bar: "h-6 w-full px-1.5",
  compact: "h-5 w-full px-1",
};

/**
 * Un bloque dibujado en la grilla (tarea 5.1-5.7): el mismo componente
 * sirve para un bloque con horario, una barra de todo el día y un chip
 * compacto del formato mes — la variante solo cambia tamaño y dirección,
 * nunca la forma por tipo ni el manejo de `isPreview`.
 *
 * Un bloque de vista previa (`isPreview`, tarea 5.7) se dibuja como texto
 * plano sin ningún elemento interactivo: nunca un `button`, nunca
 * `onSelect`, para que ni el clic ni el arrastre del grupo 6 tengan nada
 * de qué agarrarse.
 */
export function CalendarBlockChip({
  block,
  variant,
  onSelect,
  className,
  style,
}: {
  block: CalendarBlock;
  variant: CalendarBlockChipVariant;
  onSelect?: (block: CalendarBlock) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = TYPE_ICON[block.type];

  const sharedClassName = cn(
    "flex min-w-0 items-center gap-1 overflow-hidden text-xs text-foreground",
    TYPE_SHAPE_CLASS[block.type],
    VARIANT_CLASS[variant],
    block.isPreview && "border-dashed opacity-60",
    className,
  );

  const sharedStyle: CSSProperties = {
    borderColor: block.color,
    backgroundColor: `${block.color}1a`,
    ...style,
  };

  const content = (
    <>
      <Icon aria-hidden className="size-3 shrink-0" style={{ color: block.color }} />
      <span className="min-w-0 truncate">{block.title}</span>
    </>
  );

  if (block.isPreview) {
    return (
      <div className={cn(sharedClassName, "pointer-events-none")} style={sharedStyle} title={block.title}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(block)}
      className={cn(sharedClassName, "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50")}
      style={sharedStyle}
      title={block.title}
    >
      {content}
    </button>
  );
}
