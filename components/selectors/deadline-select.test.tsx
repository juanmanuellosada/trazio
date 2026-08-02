// @vitest-environment jsdom
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, formatDate, today } from "@/lib/parser/dates";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { DateSelect, type DateSelectValue } from "./date-select";
import { DeadlineSelect } from "./deadline-select";

/**
 * Tests del selector de fecha límite (bloque 4.6/4.9): mismo lenguaje que el
 * selector de fecha (texto, accesos rápidos, calendario) pero sobre
 * `deadline`, con etiqueta y ubicación propias, y sin tocar `due_date`/
 * `due_at` de la tarea. El reloj se congela igual que en `date-select.test.tsx`.
 */

const AHORA = new Date("2026-07-26T18:00:00Z");
const ZONA = "America/Argentina/Buenos_Aires";

const PREFERENCES: UserPreferences = {
  timezone: ZONA,
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

function ControlledDeadlineSelect({ onChange }: { onChange: (deadline: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <DeadlineSelect
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      preferences={PREFERENCES}
    />
  );
}

describe("DeadlineSelect", () => {
  beforeEach(() => {
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tiene una etiqueta y un ícono propios, distintos del selector de fecha de vencimiento", () => {
    render(<ControlledDeadlineSelect onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fecha límite" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fecha de vencimiento" })).not.toBeInTheDocument();
  });

  it("un acceso rápido guarda exactamente la fecha que dice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDeadlineSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha límite" }));
    await user.click(screen.getByRole("button", { name: /^Mañana/ }));

    expect(onChange).toHaveBeenCalledWith(formatDate(addDays(today(AHORA, ZONA), 1)));
  });

  it("el campo de texto resuelve lo mismo que el parser", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDeadlineSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha límite" }));
    await user.type(screen.getByLabelText("Escribí la fecha límite"), "en 3 días");
    await screen.findByText(/^Enter para guardar/);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(formatDate(addDays(today(AHORA, ZONA), 3))));
  });

  it("el trigger muestra el valor elegido con el prefijo 'Límite'", async () => {
    const user = userEvent.setup();
    render(<ControlledDeadlineSelect onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Fecha límite" }));
    await user.click(screen.getByRole("button", { name: /^Mañana/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Fecha límite" })).toHaveTextContent("Límite:"));
  });

  it("elegir una fecha límite no toca due_date ni due_at de la tarea (los dos selectores conviven sin confundirse)", async () => {
    const user = userEvent.setup();
    const dueOnChange = vi.fn();
    const deadlineOnChange = vi.fn();
    const initialDue: DateSelectValue = { dueDate: null, dueAt: null, durationMinutes: null };

    function Detalle() {
      const [due, setDue] = useState(initialDue);
      const [deadline, setDeadline] = useState<string | null>(null);
      return (
        <>
          <DateSelect
            value={due}
            onChange={(next) => {
              dueOnChange(next);
              setDue(next);
            }}
            preferences={PREFERENCES}
          />
          <DeadlineSelect
            value={deadline}
            onChange={(next) => {
              deadlineOnChange(next);
              setDeadline(next);
            }}
            preferences={PREFERENCES}
          />
        </>
      );
    }

    render(<Detalle />);
    await user.click(screen.getByRole("button", { name: "Fecha límite" }));
    await user.click(screen.getByRole("button", { name: /^Mañana/ }));

    expect(deadlineOnChange).toHaveBeenCalledTimes(1);
    expect(dueOnChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Fecha de vencimiento" })).toHaveTextContent("Agregar fecha");
  });

  it("los controles son alcanzables solo con teclado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDeadlineSelect onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: "Fecha límite" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const input = await screen.findByLabelText("Escribí la fecha límite");
    expect(input).toHaveFocus();

    await user.keyboard("hoy");
    await screen.findByText(/^Enter para guardar/);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(formatDate(today(AHORA, ZONA))));
  });
});
