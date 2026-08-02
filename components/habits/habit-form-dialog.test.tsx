// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { HabitFormDialog } from "./habit-form-dialog";
import type { Habit } from "@/lib/habits/habit-columns";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

const TEST_PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

// Mismo recorte que `components/projects/emoji-picker.test.tsx`: el dataset
// real de emojibase-data no hace falta para probar el formulario, solo un
// emoji seleccionable de verdad.
const { FIXTURE_EMOJIS, FIXTURE_MESSAGES, FIXTURE_GROUP_META } = vi.hoisted(() => ({
  FIXTURE_EMOJIS: [{ unicode: "🧘", label: "persona en posición de loto", tags: ["meditar", "yoga"], hexcode: "1F9D8", group: 1 }],
  FIXTURE_MESSAGES: { groups: [{ key: "people-body", message: "personas y cuerpo", order: 1 }] },
  FIXTURE_GROUP_META: { groups: { "1": "people-body" } },
}));
vi.mock("emojibase-data/es/compact.json", () => ({ default: FIXTURE_EMOJIS }));
vi.mock("emojibase-data/es/messages.json", () => ({ default: FIXTURE_MESSAGES }));
vi.mock("emojibase-data/meta/groups.json", () => ({ default: FIXTURE_GROUP_META }));

vi.mock("@/lib/supabase/client", () => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const eq = vi.fn();
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ insert, update }));
  const getSession = vi.fn();
  return {
    createClient: () => ({ from, auth: { getSession } }),
    __mock: { from, insert, select, single, update, eq, getSession },
  };
});

const { insert, single, update, eq, getSession } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

function renderDialog(props: Partial<React.ComponentProps<typeof HabitFormDialog>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <HabitFormDialog open onOpenChange={() => {}} {...props} />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

async function pickIcon(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /ícono/i }));
  await user.click(await screen.findByRole("option", { name: "persona en posición de loto" }));
}

const existingHabit: Habit = {
  id: "habit-1",
  name: "Meditar",
  icon: "🧘",
  color: "celeste",
  duration_minutes: 15,
  scheduled_time: "07:00",
  frequency_type: "daily",
  times_per_week: null,
  days_of_week: null,
  is_archived: false,
  created_at: "2026-01-01T00:00:00.000Z",
  completed_today: false,
};

describe("HabitFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    single.mockResolvedValue({ data: { ...existingHabit, id: "new-id" }, error: null });
    eq.mockResolvedValue({ error: null });
  });

  it("no crea el hábito y muestra los errores cuando faltan los campos requeridos", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Crear hábito" }));

    expect(await screen.findByText(/falta el nombre del hábito/i)).toBeInTheDocument();
    expect(screen.getByText(/falta elegir un ícono/i)).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("no ofrece ningún campo de tarea (spec 'Un hábito no lleva atributos de tarea')", () => {
    renderDialog();
    expect(screen.queryByLabelText(/proyecto/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/etiqueta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/prioridad/i)).not.toBeInTheDocument();
  });

  it("crea un hábito diario con los campos completos", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nombre"), "Tomar agua");
    await pickIcon(user);
    await user.type(screen.getByLabelText("Duración estimada (min)"), "5");
    await user.click(screen.getByRole("button", { name: "Crear hábito" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Tomar agua",
        icon: "🧘",
        color: "amarillo",
        duration_minutes: 5,
        frequency_type: "daily",
        times_per_week: null,
        days_of_week: null,
        scheduled_time: null,
      }),
    );
  });

  it("el horario es opcional: sin tocarlo, no aparece el bloque de hora (sin-controles-nativos)", () => {
    renderDialog();

    expect(screen.queryByLabelText("Hora")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar horario" })).toBeInTheDocument();
  });

  it("agregar un horario ofrece el bloque de hora propio (sin <input type=\"time\">) y lo guarda como HH:MM", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Agregar horario" }));
    expect(screen.getByLabelText("Hora")).toHaveValue("09:00");
    expect(document.querySelector('input[type="time"]')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre"), "Tomar sol");
    await pickIcon(user);
    await user.type(screen.getByLabelText("Duración estimada (min)"), "10");
    await user.click(screen.getByRole("button", { name: "Crear hábito" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ scheduled_time: "09:00" }));
  });

  it("muestra el campo de veces por semana solo para esa frecuencia, y lo manda al crear", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.queryByLabelText("Veces por semana")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Se repite" }));
    await user.click(await screen.findByRole("option", { name: "N veces por semana" }));

    const timesInput = screen.getByLabelText("Veces por semana");
    await user.clear(timesInput);
    await user.type(timesInput, "3");

    await user.type(screen.getByLabelText("Nombre"), "Ejercicio");
    await pickIcon(user);
    await user.type(screen.getByLabelText("Duración estimada (min)"), "30");
    await user.click(screen.getByRole("button", { name: "Crear hábito" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ frequency_type: "times_per_week", times_per_week: 3, days_of_week: null }),
    );
  });

  it("días específicos exige al menos un día elegido", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Se repite" }));
    await user.click(await screen.findByRole("option", { name: "Días específicos" }));

    await user.type(screen.getByLabelText("Nombre"), "Gimnasio");
    await pickIcon(user);
    await user.type(screen.getByLabelText("Duración estimada (min)"), "45");
    await user.click(screen.getByRole("button", { name: "Crear hábito" }));

    expect(await screen.findByText(/elegí al menos un día/i)).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Lunes" }));
    await user.click(screen.getByRole("button", { name: "Miércoles" }));
    await user.click(screen.getByRole("button", { name: "Crear hábito" }));

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ frequency_type: "specific_days", days_of_week: [1, 3], times_per_week: null }),
    );
  });

  it("precarga los campos existentes y guarda los cambios al editar", async () => {
    const user = userEvent.setup();
    renderDialog({ habit: existingHabit });

    const nameInput = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(nameInput.value).toBe("Meditar");
    expect((screen.getByLabelText("Duración estimada (min)") as HTMLInputElement).value).toBe("15");

    await user.clear(nameInput);
    await user.type(nameInput, "Meditar 10 minutos");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "Meditar 10 minutos" }));
    expect(eq).toHaveBeenCalledWith("id", "habit-1");
  });
});
