// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HabitReminderPicker } from "./habit-reminder-picker";
import type { HabitReminderRow } from "@/lib/habits/use-habit-reminders";

/**
 * Tests de `HabitReminderPicker` (tarea 5.5, spec `recordatorios-de-habitos`):
 * agregar y quitar, que nunca se ofrezca un recordatorio puntual (spec "No
 * se ofrece el recordatorio puntual") y que el texto de las opciones cambie
 * cuando el hábito no tiene hora (spec "Un hábito sin hora explica contra
 * qué se calcula"). El modo borrador (sin `habitId`) se prueba con
 * `drafts`/`onChange` directo; el modo en vivo (con `habitId`) mockea
 * `lib/habits/use-habit-reminders.ts`, mismo patrón que
 * `habit-today-row.test.tsx` con `lib/habits/mutations.ts`.
 */

const addMutate = vi.fn();
const removeMutate = vi.fn();
let mockPersisted: HabitReminderRow[] = [];

vi.mock("@/lib/habits/use-habit-reminders", () => ({
  useHabitReminders: () => ({ data: mockPersisted }),
  useAddHabitReminder: () => ({ mutate: addMutate, isPending: false }),
  useRemoveHabitReminder: () => ({ mutate: removeMutate, isPending: false }),
}));

const REFERENCE_TIME = "09:00:00";

describe("HabitReminderPicker", () => {
  it("nunca ofrece un recordatorio puntual: todas las opciones son desfases relativos", async () => {
    const user = userEvent.setup();
    render(
      <HabitReminderPicker
        hasScheduledTime
        referenceTime={REFERENCE_TIME}
        timeFormat={24}
        drafts={[]}
        onChange={vi.fn()}
      />,
    );

    // El disparador tiene `aria-label="Recordatorios"` fijo (mismo criterio
    // que `ReminderPicker` de tareas); el texto visible con la cantidad es
    // solo contenido, no el nombre accesible.
    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    await user.click(screen.getByRole("combobox", { name: "Elegir cuándo avisar" }));

    const options = await screen.findAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.textContent).toMatch(/antes|a la hora/i);
    }
    expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fecha y hora fija/i)).not.toBeInTheDocument();
  });

  it("agregar en modo borrador llama a onChange con el desfase elegido", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <HabitReminderPicker hasScheduledTime referenceTime={REFERENCE_TIME} timeFormat={24} drafts={[]} onChange={onChange} />,
    );

    // El disparador tiene `aria-label="Recordatorios"` fijo (mismo criterio
    // que `ReminderPicker` de tareas); el texto visible con la cantidad es
    // solo contenido, no el nombre accesible.
    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    await user.click(screen.getByRole("combobox", { name: "Elegir cuándo avisar" }));
    await user.click(await screen.findByRole("option", { name: "A la hora del hábito" }));

    expect(onChange).toHaveBeenCalledWith([0]);
  });

  it("quitar en modo borrador llama a onChange sin ese desfase", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <HabitReminderPicker
        hasScheduledTime
        referenceTime={REFERENCE_TIME}
        timeFormat={24}
        drafts={[0, -30]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    expect(screen.getByText("Recordatorios (2)")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Quitar recordatorio" })[0]);

    expect(onChange).toHaveBeenCalledWith([-30]);
  });

  it("el texto nombra la hora de referencia cuando el hábito no tiene hora programada", async () => {
    const user = userEvent.setup();
    render(
      <HabitReminderPicker
        hasScheduledTime={false}
        referenceTime={REFERENCE_TIME}
        timeFormat={24}
        drafts={[]}
        onChange={vi.fn()}
      />,
    );

    // El disparador tiene `aria-label="Recordatorios"` fijo (mismo criterio
    // que `ReminderPicker` de tareas); el texto visible con la cantidad es
    // solo contenido, no el nombre accesible.
    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    await user.click(screen.getByRole("combobox", { name: "Elegir cuándo avisar" }));

    expect(await screen.findByRole("option", { name: /A la hora de referencia \(09:00\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /10 minutos antes de las 09:00/ })).toBeInTheDocument();
  });

  it("modo en vivo (con habitId): agregar y quitar llaman a las mutaciones, no a onChange", async () => {
    mockPersisted = [{ id: "r1", habit_id: "habit-1", offset_minutes: -15 }];
    const user = userEvent.setup();
    render(<HabitReminderPicker habitId="habit-1" hasScheduledTime referenceTime={REFERENCE_TIME} timeFormat={24} />);

    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    expect(screen.getByText("Recordatorios (1)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitar recordatorio" }));
    expect(removeMutate).toHaveBeenCalledWith("r1");

    await user.click(screen.getByRole("combobox", { name: "Elegir cuándo avisar" }));
    await user.click(await screen.findByRole("option", { name: "A la hora del hábito" }));
    expect(addMutate).toHaveBeenCalledWith(0);

    mockPersisted = [];
  });
});
