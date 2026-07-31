"use client";

import { useDeleteHabit } from "@/lib/habits/mutations";
import type { Habit } from "@/lib/habits/habit-columns";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

/**
 * Confirmación de borrado de hábito (tarea 3.10): a diferencia de archivar
 * (D-F, conserva el historial intacto), eliminar borra en cascada todas
 * las marcas de `habit_completions` y las reprogramaciones de
 * `habit_schedule_overrides` (`on delete cascade`, migración de la tabla) —
 * el aviso lo dice explícito para no confundir las dos acciones.
 */
export function DeleteHabitDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit;
}) {
  const deleteHabit = useDeleteHabit();

  function handleConfirm() {
    deleteHabit.mutate(habit.id);
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar “${habit.name}”`}
      description="Se va a eliminar junto con todo su historial de marcas y sus reprogramaciones de horario. A diferencia de archivar, esta acción no se puede deshacer y la racha no se puede recuperar."
      confirmLabel="Eliminar de forma permanente"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
