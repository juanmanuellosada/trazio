// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecurrenceEditor, type RecurrenceValue } from "./recurrence-editor";

function renderEditor(value: RecurrenceValue) {
  const onChange = vi.fn();
  render(<RecurrenceEditor value={value} onChange={onChange} />);
  return { onChange };
}

/** Envoltorio con estado, para los tests que necesitan ver el resultado de un cambio reflejado en el propio componente (controlado, sin estado propio). */
function ControlledHarness({ initial }: { initial: RecurrenceValue }) {
  const [value, setValue] = useState(initial);
  return <RecurrenceEditor value={value} onChange={setValue} />;
}

describe("RecurrenceEditor (bloque 5.6)", () => {
  it("sin repetición: muestra solo el botón para activarla", () => {
    renderEditor({ rule: null, endsAt: null, count: null });
    expect(screen.getByRole("button", { name: "Repetir tarea" })).toBeInTheDocument();
    expect(screen.queryByTestId("recurrence-editor")).not.toBeInTheDocument();
  });

  it("activar la repetición arranca en \"cada 1 semana\", sin fin", async () => {
    const { onChange } = renderEditor({ rule: null, endsAt: null, count: null });
    await userEvent.click(screen.getByRole("button", { name: "Repetir tarea" }));
    expect(onChange).toHaveBeenCalledWith({ rule: "FREQ=WEEKLY", endsAt: null, count: null });
  });

  it("con repetición activa: muestra el intervalo, la frecuencia y \"Quitar repetición\"", () => {
    renderEditor({ rule: "FREQ=WEEKLY", endsAt: null, count: null });
    expect(screen.getByTestId("recurrence-editor")).toBeInTheDocument();
    expect(screen.getByLabelText("Intervalo de repetición")).toHaveValue(1);
    expect(screen.getByRole("combobox", { name: "Frecuencia de la repetición" })).toHaveTextContent("semana");
    expect(screen.getByRole("button", { name: /Quitar repetición/ })).toBeInTheDocument();
  });

  it("cambiar el intervalo reconstruye la regla con FREQ e INTERVAL", () => {
    const { onChange } = renderEditor({ rule: "FREQ=DAILY", endsAt: null, count: null });
    fireEvent.change(screen.getByLabelText("Intervalo de repetición"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith({ rule: "FREQ=DAILY;INTERVAL=3", endsAt: null, count: null });
  });

  it("quitar la repetición limpia regla, fecha tope y cantidad", async () => {
    const { onChange } = renderEditor({ rule: "FREQ=WEEKLY;INTERVAL=2", endsAt: "2026-12-31", count: null });
    await userEvent.click(screen.getByRole("button", { name: /Quitar repetición/ }));
    expect(onChange).toHaveBeenCalledWith({ rule: null, endsAt: null, count: null });
  });

  it("elegir \"En una fecha\" muestra el campo de fecha tope", async () => {
    render(<ControlledHarness initial={{ rule: "FREQ=WEEKLY", endsAt: null, count: null }} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Termina" }));
    await userEvent.click(await screen.findByRole("option", { name: "En una fecha" }));
    expect(screen.getByLabelText("Fecha de fin de la repetición")).toBeInTheDocument();
  });

  it("elegir \"Después de repetir\" muestra el campo de cantidad", async () => {
    render(<ControlledHarness initial={{ rule: "FREQ=WEEKLY", endsAt: null, count: null }} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Termina" }));
    await userEvent.click(await screen.findByRole("option", { name: "Después de repetir" }));
    expect(screen.getByLabelText("Cantidad de repeticiones")).toHaveValue(1);
  });

  it("ya con fecha tope configurada: el selector de fin arranca en \"En una fecha\"", () => {
    renderEditor({ rule: "FREQ=WEEKLY", endsAt: "2026-12-31", count: null });
    expect(screen.getByRole("combobox", { name: "Termina" })).toHaveTextContent("En una fecha");
    expect(screen.getByLabelText("Fecha de fin de la repetición")).toHaveValue("2026-12-31");
  });

  it("ya con cantidad configurada: el selector de fin arranca en \"Después de repetir\"", () => {
    renderEditor({ rule: "FREQ=WEEKLY", endsAt: null, count: 5 });
    expect(screen.getByRole("combobox", { name: "Termina" })).toHaveTextContent("Después de repetir");
    expect(screen.getByLabelText("Cantidad de repeticiones")).toHaveValue(5);
  });
});
