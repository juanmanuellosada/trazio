"use client";

import { useEffect, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { X } from "lucide-react";
import { habitFormSchema, type HabitFormOutput } from "@/lib/validation/habits";
import { PROJECT_COLOR_IDS } from "@/lib/validation/colors";
import { useCreateHabit, useUpdateHabit } from "@/lib/habits/mutations";
import type { Habit } from "@/lib/habits/habit-columns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField, type SelectFieldOption } from "@/components/primitives/select-field";
import { ColorSwatchPicker } from "@/components/projects/color-swatch-picker";
import { EmojiPicker } from "@/components/projects/emoji-picker";
import { TimeField, DEFAULT_TIME, parseHHMM, toHHMM } from "@/components/selectors/time-field";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";

type FrequencyOption = "daily" | "times_per_week" | "specific_days";

/**
 * Forma "aplanada" del formulario: `habitFormSchema` es un
 * `discriminatedUnion` (cada tipo de frecuencia declara solo sus propios
 * campos, `lib/validation/habits.ts`), pero React Hook Form necesita un
 * único tipo de objeto para tipar `register`/`Controller`. Acá los campos
 * de los tres tipos conviven siempre; cuál rama del schema valida cada
 * envío lo decide `frequency_type` — `zod` descarta en silencio los campos
 * que no pertenecen a la rama activa (ningún `.strict()` en esos objetos),
 * así que no hace falta limpiarlos al cambiar de tipo. El `resolver` se
 * castea al tipo aplanado en el único punto donde ambas formas se tocan.
 */
type HabitFormFields = {
  frequency_type: FrequencyOption;
  name: string;
  icon: string;
  color: string;
  duration_minutes: number | undefined;
  scheduled_time: string | undefined;
  times_per_week: number | undefined;
  days_of_week: number[] | undefined;
};

const FREQUENCY_OPTIONS: SelectFieldOption<FrequencyOption>[] = [
  { value: "daily", label: "Todos los días" },
  { value: "times_per_week", label: "N veces por semana" },
  { value: "specific_days", label: "Días específicos" },
];

const DAY_OPTIONS: { value: number; short: string; full: string }[] = [
  { value: 1, short: "Lu", full: "Lunes" },
  { value: 2, short: "Ma", full: "Martes" },
  { value: 3, short: "Mi", full: "Miércoles" },
  { value: 4, short: "Ju", full: "Jueves" },
  { value: 5, short: "Vi", full: "Viernes" },
  { value: 6, short: "Sá", full: "Sábado" },
  { value: 7, short: "Do", full: "Domingo" },
];

const DEFAULT_VALUES: HabitFormFields = {
  frequency_type: "daily",
  name: "",
  icon: "",
  color: PROJECT_COLOR_IDS[0],
  duration_minutes: undefined,
  scheduled_time: undefined,
  times_per_week: undefined,
  // `[]`, no `undefined`: así, si se envía sin elegir ningún día, el error
  // que se ve es el mensaje propio de `daysOfWeekSchema` ("Elegí al menos
  // un día…") y no el genérico de zod para un valor de tipo incorrecto.
  days_of_week: [],
};

function toFormValues(habit: Habit): HabitFormFields {
  return {
    frequency_type: habit.frequency_type,
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    duration_minutes: habit.duration_minutes,
    scheduled_time: habit.scheduled_time ?? undefined,
    times_per_week: habit.times_per_week ?? undefined,
    days_of_week: habit.days_of_week ?? [],
  };
}

/**
 * Diálogo de alta y edición de hábito (tarea 3.9): reusa `EmojiPicker` y
 * `ColorSwatchPicker` tal cual, con la misma validación de contraste (spec
 * "El color de un hábito sigue la misma paleta y validación que
 * proyectos"). Ningún campo de tarea (spec "Un hábito no lleva atributos
 * de tarea"): sin proyecto, sección, etiquetas, prioridad, subtareas,
 * comentarios ni recordatorios.
 */
export function HabitFormDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit;
}) {
  const nameId = useId();
  const durationId = useId();
  const timeId = useId();
  const timesId = useId();
  const isEditing = !!habit;
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const pending = createHabit.isPending || updateHabit.isPending;
  const { timeFormat } = useUserPreferences();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HabitFormFields, unknown, HabitFormOutput>({
    resolver: zodResolver(habitFormSchema) as unknown as Resolver<HabitFormFields, unknown, HabitFormOutput>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(habit ? toFormValues(habit) : DEFAULT_VALUES);
  }, [open, habit, reset]);

  const frequencyType = useWatch({ control, name: "frequency_type" });

  async function onSubmit(values: HabitFormOutput) {
    if (habit) {
      await updateHabit.mutateAsync({
        id: habit.id,
        patch: {
          name: values.name,
          icon: values.icon,
          color: values.color,
          duration_minutes: values.duration_minutes,
          scheduled_time: values.scheduled_time,
          frequency_type: values.frequency_type,
          times_per_week: values.frequency_type === "times_per_week" ? values.times_per_week : null,
          days_of_week: values.frequency_type === "specific_days" ? values.days_of_week : null,
        },
      });
    } else {
      await createHabit.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar hábito" : "Nuevo hábito"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cambiá el nombre, el ícono, el color, la duración, el horario o la forma de repetirse."
              : "Elegí un nombre, un ícono, un color, una duración estimada y cómo se repite."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nombre</Label>
            <Input
              id={nameId}
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              className="h-11 text-base"
              {...register("name")}
            />
            {errors.name ? (
              <p id={`${nameId}-error`} role="alert" className="text-sm text-error">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <ColorSwatchPicker value={field.value} onChange={field.onChange} error={errors.color?.message} />
                )}
              />
            </div>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <EmojiPicker
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  error={errors.icon?.message}
                  label="Ícono"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={durationId}>Duración estimada (min)</Label>
              <Input
                id={durationId}
                type="number"
                min={1}
                step={1}
                aria-invalid={!!errors.duration_minutes}
                aria-describedby={errors.duration_minutes ? `${durationId}-error` : undefined}
                className="h-11 text-base"
                {...register("duration_minutes", { valueAsNumber: true })}
              />
              {errors.duration_minutes ? (
                <p id={`${durationId}-error`} role="alert" className="text-sm text-error">
                  {errors.duration_minutes.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={timeId}>Horario (opcional)</Label>
              <Controller
                control={control}
                name="scheduled_time"
                render={({ field }) =>
                  field.value ? (
                    <div className="flex items-center gap-1.5">
                      <TimeField
                        id={timeId}
                        value={parseHHMM(field.value)}
                        onChange={(next) => field.onChange(toHHMM(next))}
                        timeFormat={timeFormat}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar horario"
                        onClick={() => field.onChange(undefined)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => field.onChange(toHHMM(DEFAULT_TIME))}>
                      Agregar horario
                    </Button>
                  )
                }
              />
              {errors.scheduled_time ? (
                <p role="alert" className="text-sm text-error">
                  {errors.scheduled_time.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Se repite</Label>
            <Controller
              control={control}
              name="frequency_type"
              render={({ field }) => (
                <SelectField ariaLabel="Se repite" value={field.value} onChange={field.onChange} options={FREQUENCY_OPTIONS} />
              )}
            />
          </div>

          {frequencyType === "times_per_week" && (
            <div className="space-y-1.5">
              <Label htmlFor={timesId}>Veces por semana</Label>
              <Input
                id={timesId}
                type="number"
                min={1}
                max={7}
                step={1}
                aria-invalid={!!errors.times_per_week}
                className="h-11 w-24 text-base"
                {...register("times_per_week", { valueAsNumber: true })}
              />
              {errors.times_per_week ? (
                <p role="alert" className="text-sm text-error">
                  {errors.times_per_week.message}
                </p>
              ) : null}
            </div>
          )}

          {frequencyType === "specific_days" && (
            <div className="space-y-1.5">
              <Label>Días</Label>
              <Controller
                control={control}
                name="days_of_week"
                render={({ field }) => (
                  <div role="group" aria-label="Días de la semana" className="flex flex-wrap gap-1.5">
                    {DAY_OPTIONS.map((day) => {
                      const selected = (field.value ?? []).includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          aria-pressed={selected}
                          aria-label={day.full}
                          onClick={() => {
                            const current = field.value ?? [];
                            field.onChange(
                              selected
                                ? current.filter((d) => d !== day.value)
                                : [...current, day.value].sort((a, b) => a - b),
                            );
                          }}
                          className={cn(
                            "flex h-9 w-11 items-center justify-center rounded-lg border text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input text-foreground hover:bg-muted",
                          )}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              {errors.days_of_week ? (
                <p role="alert" className="text-sm text-error">
                  {errors.days_of_week.message}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear hábito"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
