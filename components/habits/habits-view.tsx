"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus, Repeat } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { useHabits } from "@/lib/habits/use-habits";
import type { Habit, HabitFrequencyType } from "@/lib/habits/habit-columns";
import { useHabitCompletionsHistory } from "@/lib/habits/use-habit-completions-history";
import type { HabitCompletionsHistory } from "@/lib/habits/get-habit-completions-history";
import { useHabitStreaks, type HabitStreaksById } from "@/lib/habits/use-habit-streaks";
import { habitsDueToday } from "@/lib/habits/today";
import { HabitCard } from "./habit-card";
import { HabitFormDialog } from "./habit-form-dialog";
import { DeleteHabitDialog } from "./delete-habit-dialog";

const GROUP_ORDER: HabitFrequencyType[] = ["daily", "times_per_week", "specific_days"];
const GROUP_LABELS: Record<HabitFrequencyType, string> = {
  daily: "Todos los días",
  times_per_week: "Varias veces por semana",
  specific_days: "Días específicos",
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-lg font-semibold text-foreground sm:text-xl">{value}</p>
    </div>
  );
}

/**
 * Pantalla Hábitos (tareas 3.1 a 3.12): encabezado con los tres números
 * (spec "Encabezado con tres números"), hábitos activos agrupados por
 * forma de repetirse (spec "Agrupación por forma de repetirse"), y una
 * sección desplegable con los archivados. Sin selección múltiple (spec
 * "La pantalla no ofrece selección múltiple"): ningún hábito es
 * seleccionable acá, a diferencia de las tareas.
 *
 * `nowIso` viene del Server Component, mismo criterio que `HoyView`: usar
 * el mismo instante que ya usó el servidor evita que el primer render del
 * cliente diverja por el simple paso del reloj.
 */
export function HabitsView({
  timezone,
  nowIso,
  todayDate,
  initialHabits,
  initialCompletionsHistory,
  initialStreaks,
}: {
  timezone: string;
  nowIso: string;
  todayDate: string;
  initialHabits: Habit[];
  initialCompletionsHistory: HabitCompletionsHistory;
  initialStreaks: HabitStreaksById;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const { data: habitsData } = useHabits(timezone, initialHabits);
  const habits = habitsData ?? [];
  const { data: historyData } = useHabitCompletionsHistory(timezone, initialCompletionsHistory);
  const history = historyData ?? {};
  const { streaksById } = useHabitStreaks(
    habits.map((h) => h.id),
    now,
    initialStreaks,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>(undefined);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  function openCreate() {
    setEditingHabit(undefined);
    setFormOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setFormOpen(true);
  }

  const active = habits.filter((h) => !h.is_archived);
  const archived = habits.filter((h) => h.is_archived);
  const dueTodayIds = new Set(habitsDueToday(active, timezone, now).map((h) => h.id));
  const doneToday = active.filter((h) => dueTodayIds.has(h.id) && h.completed_today).length;
  const bestStreakOverall = habits.reduce((max, h) => Math.max(max, streaksById[h.id]?.bestStreak ?? 0), 0);

  const groups: Record<HabitFrequencyType, Habit[]> = { daily: [], times_per_week: [], specific_days: [] };
  for (const habit of active) groups[habit.frequency_type].push(habit);

  function renderCard(habit: Habit) {
    return (
      <HabitCard
        key={habit.id}
        habit={habit}
        streak={streaksById[habit.id]}
        completedDates={history[habit.id] ?? []}
        dueToday={dueTodayIds.has(habit.id)}
        timezone={timezone}
        now={now}
        todayDate={todayDate}
        onEdit={() => openEdit(habit)}
        onDelete={() => setDeletingHabit(habit)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="w-full max-w-content space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Hábitos</h1>
            {habits.length > 0 && (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Nuevo hábito
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile label="Activos" value={active.length} />
            <StatTile label="Mejor racha" value={bestStreakOverall} />
            <StatTile label="Hoy" value={`${doneToday} de ${dueTodayIds.size}`} />
          </div>
        </div>
      </header>

      <div className="w-full max-w-content flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {habits.length === 0 ? (
          <TaskListEmptyState
            icon={Repeat}
            title="Todavía no tenés hábitos."
            description="Un hábito se repite todos los días, varias veces por semana o en días específicos, y no cuelga de ningún proyecto. Creá el primero para empezar a marcarlo."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Nuevo hábito
              </Button>
            }
          />
        ) : active.length === 0 ? (
          <p className="px-1 text-sm text-text-secondary">No tenés hábitos activos.</p>
        ) : (
          GROUP_ORDER.filter((key) => groups[key].length > 0).map((key) => (
            <section key={key} className="space-y-2.5">
              <h2 className="text-sm font-medium text-text-secondary">{GROUP_LABELS[key]}</h2>
              <ul className="space-y-2.5">{groups[key].map(renderCard)}</ul>
            </section>
          ))
        )}

        {archived.length > 0 && (
          <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
            <CollapsibleTrigger className="flex h-9 items-center gap-1.5 rounded-md text-sm font-medium text-text-secondary outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <ChevronRight className={`size-3.5 shrink-0 transition-transform ${archivedOpen ? "rotate-90" : ""}`} />
              Archivados ({archived.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-2.5 pt-2.5">{archived.map(renderCard)}</ul>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <HabitFormDialog open={formOpen} onOpenChange={setFormOpen} habit={editingHabit} />
      {deletingHabit && (
        <DeleteHabitDialog
          open={!!deletingHabit}
          onOpenChange={(open) => {
            if (!open) setDeletingHabit(null);
          }}
          habit={deletingHabit}
        />
      )}
    </div>
  );
}
