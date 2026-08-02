"use client";

import { useId, useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Clock, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMounted } from "@/hooks/use-mounted";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { CalendarGrid } from "@/components/selectors/calendar-grid";
import { TimeField, DEFAULT_TIME, parseHHMM, toHHMM, type TimeValue } from "@/components/selectors/time-field";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/habits/habit-columns";
import type { HabitStreak } from "@/lib/habits/streak";
import { buildMiniMapCells, currentWeekProgress } from "@/lib/habits/habit-history";
import { formatHabitDuration, formatHabitFrequency, formatHabitTime, formatStreak } from "@/lib/habits/format";
import { useMarkHabitDone, useUnmarkHabitDone, useUpdateHabit } from "@/lib/habits/mutations";
import { effectiveScheduledTime } from "@/lib/habits/today";
import {
  useHabitScheduleOverride,
  useRemoveHabitScheduleOverride,
  useSetHabitScheduleOverride,
} from "@/lib/habits/schedule-overrides";
import { HabitMiniMap } from "./habit-mini-map";

/**
 * Reprogramar el horario de un día puntual desde la tarjeta (tarea 3.11,
 * ampliado en 6.5/6.8): camino sin arrastre de D-G para "programar un
 * hábito sin horario" — antes solo ofrecía el día de hoy porque
 * `assertAppliesOnDate` solo dejaba pasar hoy; ahora que la guarda acepta
 * cualquier día que le toque al hábito (D-H), el campo de fecha viaja
 * junto con la hora para que este camino siga siendo una alternativa real
 * al arrastre en el calendario, no una versión recortada de él (D24: nada
 * queda disponible solo por arrastre).
 */
function RescheduleHabitControl({
  habit,
  todayDate,
  timezone,
}: {
  habit: Pick<Habit, "id" | "name" | "frequency_type" | "days_of_week" | "created_at" | "is_archived">;
  todayDate: string;
  timezone: string;
}) {
  const timeId = useId();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayDate);
  const [month, setMonth] = useState(() => parseISO(todayDate));
  // `null` mientras no se eligió ningún horario todavía (ni el que ya tenía
  // esa fecha, ni uno tipeado): a diferencia del bloque de hora del alta de
  // hábitos, acá `TimeField` no puede arrancar con un valor por defecto
  // (09:00) sin que la persona lo haya elegido — guardar sin darse cuenta le
  // asignaría un horario que nunca eligió, silencioso porque el campo se ve
  // lleno. Con horario existente (`overrideTime`), en cambio, arranca
  // mostrándolo y "Guardar" queda habilitado sin obligar a retipearlo.
  const [value, setValue] = useState<TimeValue | null>(null);
  const { weekStartsOn, timeFormat } = useUserPreferences();
  const { data: overrideTime } = useHabitScheduleOverride(habit.id, date);
  const setOverride = useSetHabitScheduleOverride();
  const removeOverride = useRemoveHabitScheduleOverride();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDate(todayDate);
      setMonth(parseISO(todayDate));
      setValue(overrideTime ? parseHHMM(overrideTime) : null);
    }
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    setValue(null);
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!value) return;
    setOverride.mutate(
      { habitId: habit.id, habit, date, scheduledTime: toHHMM(value), timezone },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleRemove() {
    removeOverride.mutate({ habitId: habit.id, date }, { onSuccess: () => setOpen(false) });
  }

  const createdDate = formatInTimeZone(habit.created_at, timezone, "yyyy-MM-dd");

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label={`Reprogramar el horario de ${habit.name}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Clock aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form onSubmit={handleSave} className="space-y-2">
          <Label className="text-text-secondary">Día</Label>
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            selectedDate={date}
            today={todayDate}
            weekStartsOn={weekStartsOn}
            minDate={createdDate}
            onSelectDate={handleDateChange}
          />
          {value ? (
            <TimeField id={timeId} label="Horario" value={value} onChange={setValue} timeFormat={timeFormat} />
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setValue(DEFAULT_TIME)}>
              Agregar horario
            </Button>
          )}
          <div className="flex justify-end gap-2 pt-1">
            {overrideTime ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                Quitar
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={!value}>
              Guardar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Tarjeta de hábito (tareas 3.4 a 3.7 y 3.11): nombre, ícono, casillero de
 * marcado solo si toca hoy (spec "El casillero no aparece si el hábito no
 * toca hoy"), frecuencia con horario y duración, mini-mapa de 14 días de
 * solo lectura, racha actual o progreso semanal según el tipo, y mejor
 * racha. El menú de acciones cubre editar, archivar/desarchivar y eliminar
 * — nada de selección múltiple (spec "La pantalla no ofrece selección
 * múltiple").
 */
export function HabitCard({
  habit,
  streak,
  completedDates,
  dueToday,
  timezone,
  now,
  todayDate,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  streak: HabitStreak | undefined;
  completedDates: string[];
  dueToday: boolean;
  timezone: string;
  now: Date;
  todayDate: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const hex = resolveProjectColorHex(habit.color, theme);
  const { timeFormat } = useUserPreferences();

  const updateHabit = useUpdateHabit();
  const mark = useMarkHabitDone();
  const unmark = useUnmarkHabitDone();
  const { data: overrideTime } = useHabitScheduleOverride(habit.id, todayDate);

  const cells = buildMiniMapCells(habit.created_at, completedDates, timezone, now);
  const isWeekly = habit.frequency_type === "times_per_week";
  const currentStreak = streak?.currentStreak ?? 0;
  const bestStreak = streak?.bestStreak ?? 0;
  const weeklyProgress = currentWeekProgress(completedDates, timezone, now);
  const effectiveTime = effectiveScheduledTime(habit, overrideTime);

  function toggleDone() {
    const variables = { habitId: habit.id, date: todayDate, timezone };
    if (habit.completed_today) unmark.mutate(variables);
    else mark.mutate(variables);
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-xl leading-none">
            {habit.icon}
          </span>
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
          <p className="min-w-0 truncate font-medium text-foreground">{habit.name}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Sin `dueToday &&`, a diferencia del casillero de abajo (tarea 6.8,
              D24): el selector de día interno ya elige cualquier fecha que le
              toque al hábito, así que restringir el botón a "hoy" dejaría sin
              camino sin arrastre a un hábito de días específicos que no toca
              hoy pero sí toca, por ejemplo, el jueves que viene en el
              calendario. */}
          <RescheduleHabitControl habit={habit} todayDate={todayDate} timezone={timezone} />

          {dueToday && (
            <button
              type="button"
              role="checkbox"
              aria-checked={habit.completed_today}
              aria-label={habit.completed_today ? `Desmarcar ${habit.name} de hoy` : `Marcar ${habit.name} como hecho hoy`}
              onClick={toggleDone}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                habit.completed_today ? "border-primary bg-primary" : "border-input",
              )}
            >
              {habit.completed_today && <span aria-hidden className="size-2 rounded-full bg-primary-foreground" />}
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`Más acciones de ${habit.name}`} />}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateHabit.mutate({ id: habit.id, patch: { is_archived: !habit.is_archived } })}
              >
                {habit.is_archived ? "Desarchivar" : "Archivar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="text-sm text-text-secondary">
        {formatHabitFrequency(habit)} · {formatHabitTime(effectiveTime, timeFormat)} ·{" "}
        {formatHabitDuration(habit.duration_minutes)}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HabitMiniMap cells={cells} />
        <div className="flex items-center gap-3 text-sm whitespace-nowrap">
          <span className="font-medium text-foreground">
            {isWeekly ? `${weeklyProgress} de ${habit.times_per_week}` : formatStreak(currentStreak, habit.frequency_type)}
          </span>
          <span className="text-text-secondary">Mejor: {formatStreak(bestStreak, habit.frequency_type)}</span>
        </div>
      </div>
    </li>
  );
}
