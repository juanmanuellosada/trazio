// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecurrenceEditor, type RecurrenceValue } from "./recurrence-editor";

function renderEditor(value: RecurrenceValue, dueDate: string | null = null) {
  const onChange = vi.fn();
  render(<RecurrenceEditor value={value} onChange={onChange} dueDate={dueDate} />);
  return { onChange };
}

/** Envoltorio con estado, para los tests que necesitan ver el resultado de un cambio reflejado en el propio componente (controlado, sin estado propio). */
function ControlledHarness({ initial, dueDate = null }: { initial: RecurrenceValue; dueDate?: string | null }) {
  const [value, setValue] = useState(initial);
  return <RecurrenceEditor value={value} onChange={setValue} dueDate={dueDate} />;
}

// Domingo 5 de abril de 2026: mismas fechas que usa `lib/recurrence/rule.test.ts`.
const DUE_DATE = "2026-04-05";

describe("RecurrenceEditor (repeticion-configurable)", () => {
  it("sin repetición: muestra solo el botón para activarla", () => {
    renderEditor({ rule: null, endsAt: null, count: null, anchor: null });
    expect(screen.getByRole("button", { name: "Repetir tarea" })).toBeInTheDocument();
    expect(screen.queryByTestId("recurrence-editor")).not.toBeInTheDocument();
  });

  it('activar la repetición arranca en "cada 1 semana", sin fin y sin ancla elegida', async () => {
    const { onChange } = renderEditor({ rule: null, endsAt: null, count: null, anchor: null });
    await userEvent.click(screen.getByRole("button", { name: "Repetir tarea" }));
    expect(onChange).toHaveBeenCalledWith({ rule: "FREQ=WEEKLY", endsAt: null, count: null, anchor: null });
  });

  it("quitar la repetición limpia regla, fecha tope, cantidad y ancla", async () => {
    const { onChange } = renderEditor({ rule: "FREQ=WEEKLY;INTERVAL=2", endsAt: "2026-12-31", count: null, anchor: "completion" });
    await userEvent.click(screen.getByRole("button", { name: /Quitar repetición/ }));
    expect(onChange).toHaveBeenCalledWith({ rule: null, endsAt: null, count: null, anchor: null });
  });

  describe("con fecha de tarea: opciones rápidas derivadas (D-C, tarea 3.2/5.3)", () => {
    it("las opciones nombran la fecha de la tarea", async () => {
      renderEditor({ rule: "FREQ=DAILY", endsAt: null, count: null, anchor: null }, DUE_DATE);
      const user = userEvent.setup();
      await user.click(screen.getByRole("combobox", { name: "Repetición" }));
      expect(await screen.findByRole("option", { name: "Cada semana el domingo" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Cada mes el 5" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Cada año el 5 de abril" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Personalizada…" })).toBeInTheDocument();
    });

    it("elegir una opción rápida actualiza la regla, sin tocar fin ni ancla", async () => {
      const { onChange } = renderEditor(
        { rule: "FREQ=DAILY", endsAt: "2026-12-31", count: null, anchor: "due" },
        DUE_DATE,
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole("combobox", { name: "Repetición" }));
      await user.click(await screen.findByRole("option", { name: "Cada mes el 5" }));
      expect(onChange).toHaveBeenCalledWith({
        rule: "FREQ=MONTHLY;BYMONTHDAY=5",
        endsAt: "2026-12-31",
        count: null,
        anchor: "due",
      });
    });

    it('el selector muestra "Personalizada…" cuando la regla no coincide con ninguna opción rápida', () => {
      renderEditor({ rule: "FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,WE", endsAt: null, count: null, anchor: null }, DUE_DATE);
      expect(screen.getByRole("combobox", { name: "Repetición" })).toHaveTextContent("Personalizada…");
      expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    });
  });

  it("una tarea sin fecha no ofrece las opciones derivadas: solo repetición personalizada", () => {
    renderEditor({ rule: "FREQ=DAILY", endsAt: null, count: null, anchor: null }, null);
    expect(screen.queryByRole("combobox", { name: "Repetición" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Repetición personalizada" })).toBeInTheDocument();
  });

  describe('"Termina" para una opción rápida (funcionalidad existente, sin tocar)', () => {
    it("elegir \"En una fecha\" muestra el campo de fecha tope", async () => {
      render(<ControlledHarness initial={{ rule: "FREQ=WEEKLY;BYDAY=SU", endsAt: null, count: null, anchor: null }} dueDate={DUE_DATE} />);
      await userEvent.click(screen.getByRole("combobox", { name: "Termina" }));
      await userEvent.click(await screen.findByRole("option", { name: "En una fecha" }));
      expect(screen.getByLabelText("Fecha de fin de la repetición")).toBeInTheDocument();
    });

    it("elegir \"Después de repetir\" muestra el campo de cantidad", async () => {
      render(<ControlledHarness initial={{ rule: "FREQ=WEEKLY;BYDAY=SU", endsAt: null, count: null, anchor: null }} dueDate={DUE_DATE} />);
      await userEvent.click(screen.getByRole("combobox", { name: "Termina" }));
      await userEvent.click(await screen.findByRole("option", { name: "Después de repetir" }));
      expect(screen.getByLabelText("Cantidad de repeticiones")).toHaveValue(1);
    });

    it("ya con fecha tope configurada: el selector de fin arranca en \"En una fecha\"", () => {
      renderEditor({ rule: "FREQ=WEEKLY;BYDAY=SU", endsAt: "2026-12-31", count: null, anchor: null }, DUE_DATE);
      expect(screen.getByRole("combobox", { name: "Termina" })).toHaveTextContent("En una fecha");
      expect(screen.getByLabelText("Fecha de fin de la repetición")).toHaveTextContent("31 de diciembre de 2026");
    });

    it("ya con cantidad configurada: el selector de fin arranca en \"Después de repetir\"", () => {
      renderEditor({ rule: "FREQ=WEEKLY;BYDAY=SU", endsAt: null, count: 5, anchor: null }, DUE_DATE);
      expect(screen.getByRole("combobox", { name: "Termina" })).toHaveTextContent("Después de repetir");
      expect(screen.getByLabelText("Cantidad de repeticiones")).toHaveValue(5);
    });

    it('al elegir "Personalizada…" el "Termina" de afuera desaparece (pasa a vivir en el diálogo)', () => {
      renderEditor({ rule: "FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,WE", endsAt: null, count: null, anchor: null }, DUE_DATE);
      expect(screen.queryByRole("combobox", { name: "Termina" })).not.toBeInTheDocument();
    });
  });

  describe("diálogo de repetición personalizada (D-D, D-B: no destruye la regla existente)", () => {
    it('cambiar la frecuencia de una tarea con "cada lunes" no le borra el lunes', async () => {
      // La tarea vence un miércoles: "FREQ=WEEKLY;BYDAY=MO" no coincide con
      // ninguna opción rápida (que ofrecería el domingo/miércoles según la
      // fecha), así que ya arranca en "Personalizada".
      const wednesday = "2026-04-08";
      const { onChange } = renderEditor(
        { rule: "FREQ=WEEKLY;BYDAY=MO", endsAt: null, count: null, anchor: null },
        wednesday,
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Editar" }));

      // Cambia solo el intervalo, sin tocar el multiselect de días.
      fireEvent.change(await screen.findByLabelText("Intervalo de repetición"), { target: { value: "2" } });
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(onChange).toHaveBeenCalledWith({
        rule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
        endsAt: null,
        count: null,
        anchor: null,
      });
    });

    it("elegir el ancla en el diálogo la guarda", async () => {
      const { onChange } = renderEditor(
        { rule: "FREQ=DAILY;INTERVAL=3", endsAt: null, count: null, anchor: null },
        "2026-04-08",
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Editar" }));
      await user.click(screen.getByRole("combobox", { name: "¿Desde qué fecha cuenta?" }));
      await user.click(await screen.findByRole("option", { name: "Desde el vencimiento" }));
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(onChange).toHaveBeenCalledWith({
        rule: "FREQ=DAILY;INTERVAL=3",
        endsAt: null,
        count: null,
        anchor: "due",
      });
    });

    it("cancelar el diálogo no cambia nada", async () => {
      const { onChange } = renderEditor(
        { rule: "FREQ=DAILY;INTERVAL=3", endsAt: null, count: null, anchor: null },
        "2026-04-08",
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Editar" }));
      fireEvent.change(await screen.findByLabelText("Intervalo de repetición"), { target: { value: "9" } });
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
