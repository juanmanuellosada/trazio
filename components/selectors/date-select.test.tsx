// @vitest-environment jsdom
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, formatDate, today, toDueAt } from "@/lib/parser/dates";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { DateSelect, type DateSelectValue } from "./date-select";

/**
 * Tests del selector de fecha (bloque 4.9): que el campo de lenguaje
 * natural resuelva lo mismo que `lib/parser/` para un caso real del
 * contrato de `docs/parser-test-cases.md` (caso 27), que los accesos
 * rápidos den la fecha que dicen, que "agregar hora" mueva el valor de
 * `due_date` a `due_at` sin dejar los dos, y que los tres controles sean
 * alcanzables solo con teclado. El reloj se congela (`vi.setSystemTime`)
 * para que "mañana" sea determinístico — el debounce del campo de texto
 * sigue corriendo con timers reales.
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

const EMPTY_VALUE: DateSelectValue = { dueDate: null, dueAt: null, durationMinutes: null };

function ControlledDateSelect({
  initial = EMPTY_VALUE,
  onChange,
}: {
  initial?: DateSelectValue;
  onChange: (value: DateSelectValue) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DateSelect
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      preferences={PREFERENCES}
    />
  );
}

describe("DateSelect", () => {
  beforeEach(() => {
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("el campo de texto resuelve lo mismo que el parser (caso 27 de docs/parser-test-cases.md: 'Llamar mañana a las 10')", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDateSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.type(screen.getByLabelText("Escribí la fecha de vencimiento"), "Llamar mañana a las 10");
    await screen.findByText(/^Enter para guardar/); // espera a que el debounce resuelva antes de confirmar
    await user.keyboard("{Enter}");

    const esperado = toDueAt(addDays(today(AHORA, ZONA), 1), 10, 0, ZONA);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ dueDate: null, dueAt: esperado, durationMinutes: null }));
  });

  it("un acceso rápido aplica exactamente la fecha que dice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDateSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.click(screen.getByRole("button", { name: /^Mañana/ }));

    const esperado = formatDate(addDays(today(AHORA, ZONA), 1));
    expect(onChange).toHaveBeenCalledWith({ dueDate: esperado, dueAt: null, durationMinutes: null });
  });

  it("agregar hora mueve el valor a due_at y deja due_date sin valor (nunca los dos)", async () => {
    const user = userEvent.setup();
    const hoyStr = formatDate(today(AHORA, ZONA));
    const onChange = vi.fn();

    render(<ControlledDateSelect initial={{ dueDate: hoyStr, dueAt: null, durationMinutes: null }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.click(screen.getByLabelText("Agregar hora"));

    const last = onChange.mock.calls.at(-1)?.[0] as DateSelectValue;
    expect(last.dueDate).toBeNull();
    expect(last.dueAt).not.toBeNull();

    // Sacar la hora de nuevo vuelve a due_date, con due_at limpio.
    await user.click(screen.getByLabelText("Agregar hora"));
    const afterToggleOff = onChange.mock.calls.at(-1)?.[0] as DateSelectValue;
    expect(afterToggleOff).toEqual({ dueDate: hoyStr, dueAt: null, durationMinutes: null });
  });

  it("una duración estimada se guarda en duration_minutes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDateSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.type(screen.getByLabelText("Duración estimada"), "45");

    expect(onChange).toHaveBeenCalledWith({ dueDate: null, dueAt: null, durationMinutes: 45 });
  });

  it("una duración escrita en horas se convierte y se guarda en minutos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDateSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.click(screen.getByRole("combobox", { name: "Unidad de duración" }));
    await user.click(await screen.findByRole("option", { name: "h" }));
    await user.type(screen.getByLabelText("Duración estimada"), "2");

    expect(onChange).toHaveBeenCalledWith({ dueDate: null, dueAt: null, durationMinutes: 120 });
  });

  it("un acceso rápido de duración aplica exactamente los minutos que dice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDateSelect onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.click(screen.getByRole("button", { name: "1 h" }));

    expect(onChange).toHaveBeenCalledWith({ dueDate: null, dueAt: null, durationMinutes: 60 });
  });

  it("el campo de hora acepta escribirla directamente, además de elegirla de la lista", async () => {
    const user = userEvent.setup();
    const hoyStr = formatDate(today(AHORA, ZONA));
    const onChange = vi.fn();

    render(<ControlledDateSelect initial={{ dueDate: hoyStr, dueAt: null, durationMinutes: null }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.click(screen.getByLabelText("Agregar hora"));

    const timeInput = screen.getByLabelText("Hora");
    await user.clear(timeInput);
    await user.type(timeInput, "23:15");
    timeInput.blur();

    const esperado = toDueAt(today(AHORA, ZONA), 23, 15, ZONA);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ dueDate: null, dueAt: esperado, durationMinutes: null }));
  });

  it("una hora escrita que no se reconoce muestra un error y no guarda nada", async () => {
    const user = userEvent.setup();
    const hoyStr = formatDate(today(AHORA, ZONA));
    const onChange = vi.fn();

    render(<ControlledDateSelect initial={{ dueDate: hoyStr, dueAt: null, durationMinutes: null }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Fecha de vencimiento" }));
    await user.click(screen.getByLabelText("Agregar hora"));
    onChange.mockClear();

    const timeInput = screen.getByLabelText("Hora");
    await user.clear(timeInput);
    await user.type(timeInput, "no es una hora");
    timeInput.blur();

    expect(await screen.findByRole("alert")).toHaveTextContent(/no reconocimos esa hora/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("los controles son alcanzables solo con teclado: abrir, escribir una fecha y confirmar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledDateSelect onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: "Fecha de vencimiento" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const input = await screen.findByLabelText("Escribí la fecha de vencimiento");
    expect(input).toHaveFocus();

    await user.keyboard("en 3 días");
    await screen.findByText(/^Enter para guardar/);
    await user.keyboard("{Enter}");

    const esperado = formatDate(addDays(today(AHORA, ZONA), 3));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ dueDate: esperado, dueAt: null, durationMinutes: null }));
  });
});
