"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Repeat } from "lucide-react";
import type { UnscheduledHabitChip } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";

/** Prefijo del `id` de arrastre de un chip suelto: lo usa `CalendarView` para distinguir "programar un hábito sin horario" de "mover un bloque ya programado" en un mismo `onDragEnd`. */
export const SCHEDULE_CHIP_DRAG_PREFIX = "calendar-schedule-chip:";

function DraggableChip({ chip }: { chip: UnscheduledHabitChip }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${SCHEDULE_CHIP_DRAG_PREFIX}${chip.id}`,
    data: { kind: "schedule-chip" as const, chip },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), borderColor: chip.color, backgroundColor: `${chip.color}1a` }}
      className={cn(
        "flex shrink-0 touch-none items-center gap-1 rounded-full border px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isDragging && "opacity-50",
      )}
      title={`Arrastrá para programar "${chip.title}" en un horario puntual`}
    >
      <Repeat aria-hidden className="size-3 shrink-0" style={{ color: chip.color }} />
      <span className="max-w-32 truncate">{chip.title}</span>
    </button>
  );
}

/**
 * Fila de hábitos sin horario fijo (tarea 6.6, requirement "aparece como
 * un chip suelto fuera de la grilla horaria"): vive arriba de la fila de
 * todo el día, fuera de `time-grid.tsx`, porque estos hábitos no ocupan
 * ningún horario hasta que se arrastran (o se programan desde el menú de
 * la tarjeta — D-G, camino sin arrastre). Cada chip es arrastrable con
 * `@dnd-kit`, igual que las tarjetas de `components/board/board.tsx`; el
 * `DndContext` que resuelve el `onDragEnd` vive en `calendar-view.tsx`,
 * que es quien conoce también los días de la grilla horaria donde estos
 * chips se pueden soltar.
 */
export function UnscheduledHabitsRow({ chips }: { chips: UnscheduledHabitChip[] }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-border bg-surface/40 px-2 py-1.5">
      {chips.map((chip) => (
        <DraggableChip key={chip.id} chip={chip} />
      ))}
    </div>
  );
}
