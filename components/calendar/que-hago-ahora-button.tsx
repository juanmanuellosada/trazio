"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import type { Habit } from "@/lib/habits/habit-columns";
import { formatMinutes } from "@/lib/planning/day-load";
import { useShortcutScope } from "@/lib/shortcuts/context";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { TimeFormatPreference } from "@/lib/dates/format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";
import { useTaskDetail } from "@/components/tasks/task-detail-context";
import { useNextTask } from "./use-next-task";
import type { HoyEventsResult } from "./use-hoy-events";

/** `{ key: "a" }`, de "ahora": verificada contra `lib/shortcuts/` al implementar (D-F de `design.md`) — ninguna otra tecla suelta de la app la usa. */
export const QUE_HAGO_AHORA_SHORTCUT = { key: "a" } as const;

function formatUntil(instant: Date, timezone: string, timeFormat: TimeFormatPreference): string {
  return formatInTimeZone(instant, timezone, timeFormat === 24 ? "HH:mm" : "h:mm aaaa", { locale: es });
}

/**
 * "¿Qué hago ahora?" (capacidad `que-hago-ahora`): botón en el encabezado
 * de Hoy, junto al tiempo libre, con atajo de teclado (D-F de
 * `openspec/changes/el-dia-que-entra/design.md` — botón + atajo, sin
 * paleta de comandos porque Trazio no tiene esa superficie). Al activarse
 * mira el hueco hasta el próximo bloque agendado (`useNextTask`, la misma
 * primitiva de huecos que `carga-del-dia`) y muestra uno de sus tres
 * estados dentro del popover — nunca agenda nada por su cuenta (D-A del
 * proposal, "fuera de alcance: auto-agendar").
 */
export function QueHagoAhoraButton({
  todayDate,
  timezone,
  timeFormat,
  now,
  dayEndTime,
  tasks,
  initialHabits,
  eventsState,
}: {
  todayDate: string;
  timezone: string;
  timeFormat: TimeFormatPreference;
  now: Date;
  dayEndTime: string;
  tasks: TaskRow[];
  initialHabits: Habit[];
  eventsState: HoyEventsResult;
}) {
  const [open, setOpen] = useState(false);
  const { open: openTaskDetail } = useTaskDetail();
  const result = useNextTask({ todayDate, timezone, now, dayEndTime, tasks, initialHabits, eventsState });

  useShortcutScope([{ combo: QUE_HAGO_AHORA_SHORTCUT, handler: () => setOpen(true) }]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="xs" />} aria-label="¿Qué hago ahora?">
        <Sparkles aria-hidden />
        ¿Qué hago ahora?
        <ShortcutHint combo={QUE_HAGO_AHORA_SHORTCUT} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {result.status === "day-ended" && <p className="text-sm text-text-secondary">El día ya terminó.</p>}

        {result.status === "no-gap" && (
          <p className="text-sm text-text-secondary">Estás ocupado hasta las {formatUntil(result.until, timezone, timeFormat)}.</p>
        )}

        {result.status === "no-candidate" && (
          <p className="text-sm text-text-secondary">No tenés ninguna tarea que entre en este hueco.</p>
        )}

        {result.status === "proposal" && (
          <div className="space-y-1.5">
            <p className="text-xs text-text-secondary">Podés avanzar con esto:</p>
            <button
              type="button"
              onClick={() => {
                openTaskDetail(result.task.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-input px-2.5 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="truncate text-foreground">{result.task.title}</span>
              {result.task.duration_minutes !== null && (
                <span className="shrink-0 text-xs text-text-secondary">{formatMinutes(result.task.duration_minutes)}</span>
              )}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
