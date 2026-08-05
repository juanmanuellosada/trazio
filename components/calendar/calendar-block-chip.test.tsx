// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CalendarBlock } from "@/lib/calendar/block";
import { CalendarBlockChip } from "./calendar-block-chip";

// Requirements de `calendario-legible-y-manipulable` (grupos 2 y 3): la
// escalera de contenido por alto (D-A), el control de completar que nunca
// se cae, y el ícono al lado del título en la grilla horaria (tarea 2.6).

const TZ = "America/Argentina/Buenos_Aires";

function block(overrides: Partial<CalendarBlock> = {}): CalendarBlock {
  return {
    id: "block-1",
    type: "task",
    title: "Escribir el informe",
    color: "#0284C7",
    allDay: false,
    start: "2026-08-05T10:00:00-03:00",
    end: "2026-08-05T10:15:00-03:00", // 15 minutos: no entra ni una línea más
    ...overrides,
  };
}

describe("CalendarBlockChip — escalera por alto (D-A, tarea 2.1)", () => {
  it("un bloque de quince minutos solo muestra el título", () => {
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("button", { name: "Escribir el informe" })).toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it("un bloque de una hora agrega el horario, pero no el proyecto ni las etiquetas", () => {
    const oneHourTask = block({
      end: "2026-08-05T11:00:00-03:00",
      projectName: "Trabajo",
      labels: [{ id: "l1", name: "Urgente", color: "amarillo" }],
    });
    render(<CalendarBlockChip block={oneHourTask} variant="timed" timezone={TZ} />);
    expect(screen.getByText("10:00 – 11:00")).toBeInTheDocument();
    expect(screen.queryByText("Trabajo")).not.toBeInTheDocument();
    expect(screen.queryByText("Urgente")).not.toBeInTheDocument();
  });

  it("un bloque de dos horas entra cómodo con los cuatro peldaños (tarea/hábito)", () => {
    const twoHourTask = block({
      end: "2026-08-05T12:00:00-03:00",
      projectName: "Trabajo",
      labels: [{ id: "l1", name: "Urgente", color: "amarillo" }],
    });
    render(<CalendarBlockChip block={twoHourTask} variant="timed" timezone={TZ} />);
    expect(screen.getByText("10:00 – 12:00")).toBeInTheDocument();
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Urgente")).toBeInTheDocument();
  });

  it("un evento de dos horas llega hasta el nombre del calendario, pero no tiene un cuarto peldaño", () => {
    const twoHourEvent = block({ type: "event", end: "2026-08-05T12:00:00-03:00", calendarName: "Trabajo" });
    render(<CalendarBlockChip block={twoHourEvent} variant="timed" timezone={TZ} />);
    expect(screen.getByText("10:00 – 12:00")).toBeInTheDocument();
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
  });

  it("el orden importa: el horario aparece antes que el calendario/proyecto (tarea 2.7)", () => {
    const twoHourTask = block({ end: "2026-08-05T12:00:00-03:00", projectName: "Trabajo" });
    const { container } = render(<CalendarBlockChip block={twoHourTask} variant="timed" timezone={TZ} />);
    const texts = Array.from(container.querySelectorAll("span")).map((el) => el.textContent);
    expect(texts.indexOf("10:00 – 12:00")).toBeLessThan(texts.indexOf("Trabajo"));
  });
});

describe("CalendarBlockChip — control de completar (tarea 2.4/7.7)", () => {
  it("nunca se cae: sigue presente en un bloque de quince minutos", () => {
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("un evento no tiene control de completar", () => {
    render(<CalendarBlockChip block={block({ type: "event" })} variant="timed" timezone={TZ} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("un bloque de vista previa no tiene control de completar (nunca interactivo)", () => {
    render(<CalendarBlockChip block={block({ isPreview: true })} variant="timed" timezone={TZ} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("tildar llama a onToggleComplete y no dispara onSelect (no compite con el gesto)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleComplete = vi.fn();
    render(<CalendarBlockChip block={block()} variant="timed" onSelect={onSelect} onToggleComplete={onToggleComplete} timezone={TZ} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onToggleComplete).toHaveBeenCalledWith(block());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clickear el resto del bloque llama a onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CalendarBlockChip block={block()} variant="timed" onSelect={onSelect} timezone={TZ} />);

    await user.click(screen.getByRole("button", { name: "Escribir el informe" }));

    expect(onSelect).toHaveBeenCalledWith(block());
  });

  it("un hábito cumplido se ve marcado (aria-checked)", () => {
    render(<CalendarBlockChip block={block({ type: "habit", completed: true })} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });
});

describe("CalendarBlockChip — marca de hábito (tarea 2.5)", () => {
  it("un hábito de quince minutos igual muestra su marca, junto al casillero", () => {
    render(<CalendarBlockChip block={block({ type: "habit" })} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    // El ícono de hábito (Repeat) es `aria-hidden`; se confirma indirectamente:
    // no hay ningún otro rol accesible además del casillero y la raíz.
    const root = screen.getByRole("button", { name: "Escribir el informe" });
    expect(root.querySelectorAll("svg").length).toBeGreaterThan(0);
  });
});

describe("CalendarBlockChip — el ícono al lado del título, no encima (tarea 2.6)", () => {
  it("en la grilla horaria, el ícono y el título comparten una fila propia (items-center)", () => {
    const event = block({ type: "event" });
    render(<CalendarBlockChip block={event} variant="timed" timezone={TZ} />);
    const title = screen.getByText("Escribir el informe");
    expect(title.parentElement?.className).toContain("items-center");
  });
});

describe("CalendarBlockChip — formato mes, fuera de alcance (Non-Goal)", () => {
  it("la variante compacta no cambia: sin escalera, sin control de completar", () => {
    const twoHourTask = block({ end: "2026-08-05T12:00:00-03:00", projectName: "Trabajo" });
    render(<CalendarBlockChip block={twoHourTask} variant="compact" timezone={TZ} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Trabajo")).not.toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });
});

// Defecto encontrado (no en la lista original de tareas): un bloque de
// quince minutos mide 12px y el primer peldaño de la escalera pedía 24px
// (relleno vertical + una línea de texto normal) — el contenido se recortaba
// en fragmentos ilegibles y el control de completar quedaba invisible. La
// salida es apretar, no agrandar (ningún alto mínimo): sin relleno vertical,
// tipografía más chica, una sola fila.
describe("CalendarBlockChip — modo apretado (defecto: el bloque de quince minutos era ilegible)", () => {
  it("un bloque de quince minutos va sin relleno vertical, en una sola fila, con tipografía más chica", () => {
    const { container } = render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    const root = container.querySelector('[role="button"]');
    expect(root?.className).toContain("py-0");
    expect(root?.className).toContain("flex-row");
    expect(root?.className).toContain("text-[0.625rem]");
  });

  it("un bloque de treinta minutos ya entra en modo normal, con el relleno y la dirección de siempre", () => {
    const thirtyMinuteTask = block({ end: "2026-08-05T10:30:00-03:00" });
    const { container } = render(<CalendarBlockChip block={thirtyMinuteTask} variant="timed" timezone={TZ} />);
    const root = container.querySelector('[role="button"]');
    expect(root?.className).toContain("py-1");
    expect(root?.className).toContain("flex-col");
    expect(root?.className).toContain("text-xs");
  });

  it("el punto que se ve no se achica en modo apretado: sigue midiendo lo mismo", () => {
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    const visibleDot = screen.getByRole("checkbox").firstElementChild;
    expect(visibleDot?.className).toContain("size-3");
  });
});

// Defecto de accesibilidad medido, no supuesto (no en la lista original de
// tareas): el `<button role="checkbox">` medía 12×12 en su propia caja —
// tanto el dibujo como el área tocable — por debajo del mínimo de la norma
// (24×24, WCAG 2.5.8; 44/48 son guías de Apple/Google, no la norma). Existía
// en cualquier duración, no solo en el modo apretado, porque el tamaño del
// casillero era constante. La salida: agrandar el área tocable del propio
// `<button>` con un `-inset-1.5` (6px) sobre un ancla de 12×12 fuera de
// flujo — no empuja la fila ni la escalera — dejando el punto dibujado
// (un `span` interno) intacto en 12×12. La medición real en píxeles
// (`getBoundingClientRect`) se hace en el navegador, no acá: jsdom no
// calcula layout, así que estas pruebas verifican la clase que produce esa
// medida, no el número en sí.
describe("CalendarBlockChip — casillero de completar, área tocable de 24×24 (defecto de accesibilidad)", () => {
  it("el `<button>` con el rol es el área tocable agrandada, no el punto que se ve", () => {
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("-inset-1.5");
    expect(checkbox.className).not.toContain("size-3");
  });

  it("en un bloque de una hora (fuera del modo apretado) el defecto era el mismo, y la corrección también", () => {
    const oneHourTask = block({ end: "2026-08-05T11:00:00-03:00" });
    render(<CalendarBlockChip block={oneHourTask} variant="timed" timezone={TZ} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("-inset-1.5");
    const visibleDot = checkbox.firstElementChild;
    expect(visibleDot?.className).toContain("size-3");
  });

  it("la variante barra (todo el día) comparte el mismo casillero agrandado", () => {
    render(<CalendarBlockChip block={block()} variant="bar" timezone={TZ} />);
    expect(screen.getByRole("checkbox").className).toContain("-inset-1.5");
  });
});
