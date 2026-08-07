// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("un bloque de treinta minutos agrega el horario, pero no el proyecto ni las etiquetas", () => {
    const thirtyMinuteTask = block({
      end: "2026-08-05T10:30:00-03:00",
      projectName: "Trabajo",
      labels: [{ id: "l1", name: "Urgente", color: "amarillo" }],
    });
    render(<CalendarBlockChip block={thirtyMinuteTask} variant="timed" timezone={TZ} />);
    expect(screen.getByText("10:00 – 10:30")).toBeInTheDocument();
    expect(screen.queryByText("Trabajo")).not.toBeInTheDocument();
    expect(screen.queryByText("Urgente")).not.toBeInTheDocument();
  });

  it("un bloque de una hora ya entra con los cuatro peldaños, a 96px/hora (antes hacían falta dos horas)", () => {
    const oneHourTask = block({
      end: "2026-08-05T11:00:00-03:00",
      projectName: "Trabajo",
      labels: [{ id: "l1", name: "Urgente", color: "amarillo" }],
    });
    render(<CalendarBlockChip block={oneHourTask} variant="timed" timezone={TZ} />);
    expect(screen.getByText("10:00 – 11:00")).toBeInTheDocument();
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Urgente")).toBeInTheDocument();
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

describe("CalendarBlockChip — emoji de proyecto (calendario no mostraba el emoji del proyecto)", () => {
  it("con emoji, se ve junto al nombre del proyecto", () => {
    const twoHourTask = block({ end: "2026-08-05T12:00:00-03:00", projectName: "Trabajo", projectIcon: "💼" });
    render(<CalendarBlockChip block={twoHourTask} variant="timed" timezone={TZ} />);
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("💼")).toBeInTheDocument();
  });

  it("sin emoji (proyecto sin ícono), se ve igual que antes: solo el nombre", () => {
    const twoHourTask = block({ end: "2026-08-05T12:00:00-03:00", projectName: "Trabajo" });
    render(<CalendarBlockChip block={twoHourTask} variant="timed" timezone={TZ} />);
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
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

describe("CalendarBlockChip — un bloque completado se ve atenuado y tachado (defecto: no se distinguía de uno pendiente)", () => {
  it("una tarea completada tacha el título y atenúa el texto, igual que el resto de la app", () => {
    render(<CalendarBlockChip block={block({ completed: true })} variant="timed" timezone={TZ} />);
    const title = screen.getByText("Escribir el informe");
    expect(title).toHaveClass("line-through");
    expect(title.closest('[role="button"]')).toHaveClass("text-text-completed");
  });

  it("un hábito completado tacha el título y atenúa el texto", () => {
    render(<CalendarBlockChip block={block({ type: "habit", completed: true })} variant="timed" timezone={TZ} />);
    const title = screen.getByText("Escribir el informe");
    expect(title).toHaveClass("line-through");
    expect(title.closest('[role="button"]')).toHaveClass("text-text-completed");
  });

  it("un bloque pendiente no tacha el título", () => {
    render(<CalendarBlockChip block={block({ completed: false })} variant="timed" timezone={TZ} />);
    expect(screen.getByText("Escribir el informe")).not.toHaveClass("line-through");
  });

  it("completado y salteado no se confunden: el salteado atenúa por opacidad del bloque entero, sin tachar el título", () => {
    render(<CalendarBlockChip block={block({ type: "habit", skipped: true })} variant="timed" timezone={TZ} />);
    const title = screen.getByText("Escribir el informe");
    expect(title.closest('[role="button"]')).toHaveClass("opacity-60");
    expect(title).not.toHaveClass("line-through");
  });
});

// Reporte del dueño ("los bordes de las tareas siguen del mismo color... eso
// también debería apagarse"): el borde lleva un hex arbitrario (color de
// proyecto/hábito, sin token al que bajar), así que se apaga por alfa —
// `b3` (70%), el mismo alfa aritmético que `opacity-70` en el resto de esta
// ronda (`PriorityDot`, punto de hábito, etiqueta completada).
describe("CalendarBlockChip — el borde también se apaga al completar (reporte del dueño)", () => {
  it("una tarea completada baja el borde al 70% de alfa, no al color pleno", () => {
    render(<CalendarBlockChip block={block({ completed: true })} variant="timed" timezone={TZ} />);
    const root = screen.getByText("Escribir el informe").closest('[role="button"]') as HTMLElement;
    expect(root.style.borderColor).toBe("rgba(2, 132, 199, 0.7)");
  });

  it("un hábito completado también baja el borde al 70% de alfa", () => {
    render(<CalendarBlockChip block={block({ type: "habit", completed: true })} variant="timed" timezone={TZ} />);
    const root = screen.getByText("Escribir el informe").closest('[role="button"]') as HTMLElement;
    expect(root.style.borderColor).toBe("rgba(2, 132, 199, 0.7)");
  });

  it("un bloque pendiente conserva el borde al color pleno", () => {
    render(<CalendarBlockChip block={block({ completed: false })} variant="timed" timezone={TZ} />);
    const root = screen.getByText("Escribir el informe").closest('[role="button"]') as HTMLElement;
    expect(root.style.borderColor).toBe("rgb(2, 132, 199)");
  });

  it("un hábito salteado no toca el borde (se distingue de completado: atenúa el bloque entero por opacidad, no el borde por alfa)", () => {
    render(<CalendarBlockChip block={block({ type: "habit", skipped: true })} variant="timed" timezone={TZ} />);
    const root = screen.getByText("Escribir el informe").closest('[role="button"]') as HTMLElement;
    expect(root.style.borderColor).toBe("rgb(2, 132, 199)");
  });

  it("la variante compacta también apaga el borde de un bloque completado", () => {
    const { container } = render(
      <CalendarBlockChip block={block({ end: "2026-08-05T12:00:00-03:00", completed: true })} variant="compact" timezone={TZ} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.borderColor).toBe("rgba(2, 132, 199, 0.7)");
  });
});

// Reporte del dueño ("que el marcador para marcar como completado resalte un
// poco más, que tenga el mismo borde que el recuadro de la tarea o hábito"):
// el casillero usaba tokens neutros (`border-input`/`border-primary`), sin
// relación con el `displayColor` del bloque que lo contiene.
describe("CalendarBlockChip — el casillero sin marcar toma el color del bloque (reporte del dueño)", () => {
  it("sin marcar, el borde del casillero es el mismo displayColor que el recuadro, no un gris neutro", () => {
    render(<CalendarBlockChip block={block({ completed: false })} variant="timed" timezone={TZ} />);
    const circle = screen.getByRole("checkbox").firstElementChild as HTMLElement;
    expect(circle.style.borderColor).toBe("rgb(2, 132, 199)");
  });

  it("el borde del casillero es más grueso que antes, marcado o no (resaltar un poco más)", () => {
    render(<CalendarBlockChip block={block({ completed: false })} variant="timed" timezone={TZ} />);
    expect((screen.getByRole("checkbox").firstElementChild as HTMLElement)).toHaveClass("border-2");
  });

  it("marcado, el casillero se queda con el relleno de --primary (misma señal de 'hecho' que el resto de la app), no con el color del bloque", () => {
    render(<CalendarBlockChip block={block({ completed: true })} variant="timed" timezone={TZ} />);
    const circle = screen.getByRole("checkbox").firstElementChild as HTMLElement;
    expect(circle).toHaveClass("border-primary", "bg-primary", "border-2");
    expect(circle.style.borderColor).toBe("");
  });

  it("un bloque completado apaga el borde del recuadro al 70%, pero el casillero (ya con relleno --primary) no se apaga con él", () => {
    render(<CalendarBlockChip block={block({ completed: true })} variant="timed" timezone={TZ} />);
    const circle = screen.getByRole("checkbox").firstElementChild as HTMLElement;
    expect(circle.className).not.toMatch(/opacity-/);
    expect(circle.style.borderColor).not.toContain("0.7");
  });
});

// El calendario ahora permite marcar hábitos de días pasados (defecto: el
// rótulo del casillero decía "hoy" sin importar de qué día era el bloque —
// falso en un bloque del lunes pasado, y justo el texto que lee un lector de
// pantalla).
describe("CalendarBlockChip — rótulo del casillero de hábito dice la verdad para cualquier día", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("un hábito de hoy sigue diciendo 'hoy'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T15:00:00-03:00"));
    render(<CalendarBlockChip block={block({ type: "habit" })} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("checkbox", { name: "Marcar Escribir el informe como hecho hoy" })).toBeInTheDocument();
  });

  it("un hábito de un día pasado nombra el día en vez de decir 'hoy'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T15:00:00-03:00"));
    render(<CalendarBlockChip block={block({ type: "habit" })} variant="timed" timezone={TZ} />);
    expect(
      screen.getByRole("checkbox", { name: "Marcar Escribir el informe como hecho el miércoles 5 de agosto" }),
    ).toBeInTheDocument();
  });

  it("desmarcar un hábito cumplido de un día pasado tampoco dice 'hoy'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T15:00:00-03:00"));
    render(<CalendarBlockChip block={block({ type: "habit", completed: true })} variant="timed" timezone={TZ} />);
    expect(
      screen.getByRole("checkbox", { name: "Desmarcar Escribir el informe del miércoles 5 de agosto" }),
    ).toBeInTheDocument();
  });
});

describe("CalendarBlockChip — marca de hábito (tarea 2.5)", () => {
  it("un hábito de quince minutos igual muestra su marca, junto al casillero", () => {
    render(<CalendarBlockChip block={block({ type: "habit", icon: "🧘" })} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("🧘")).toBeInTheDocument();
  });

  it("el emoji del hábito reemplaza el ícono de tipo: no se dibujan los dos (calendario no mostraba el emoji)", () => {
    render(<CalendarBlockChip block={block({ type: "habit", icon: "🧘" })} variant="timed" timezone={TZ} />);
    const root = screen.getByRole("button", { name: "Escribir el informe" });
    // El único ícono de Lucide en un bloque de tipo hábito era `Repeat`; sin
    // él, no queda ningún `svg` — solo el emoji, en un `span`.
    expect(root.querySelectorAll("svg").length).toBe(0);
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

// Reporte "el bloque arrastrado cambia de tamaño": `overlay` ya no impone su
// propio ancho fijo ni fuerza dos peldaños — llena el contenedor que arma
// `@dnd-kit` (mismo alto/ancho del bloque original) y usa la misma escalera
// que la grilla, para que un bloque de 15 minutos no dibuje horario de más.
describe("CalendarBlockChip — variant overlay se ve igual que en la grilla (reporte: cambiaba de tamaño al arrastrar)", () => {
  it("llena su contenedor (h-full w-full), sin ancho fijo propio", () => {
    const twoHourTask = block({ end: "2026-08-05T12:00:00-03:00" });
    const { container } = render(<CalendarBlockChip block={twoHourTask} variant="overlay" timezone={TZ} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("h-full");
    expect(root.className).toContain("w-full");
    expect(root.className).not.toContain("w-56");
  });

  it("un bloque por debajo de los 15 minutos entra en modo apretado, igual que en la grilla (no fuerza el horario)", () => {
    // A 96px/hora un bloque de 15 minutos (el paso mínimo de la grilla) ya
    // no cae en modo apretado (ver el describe de más abajo) — acá hace
    // falta uno más corto para seguir probando esta rama.
    const tenMinuteTask = block({ end: "2026-08-05T10:10:00-03:00" });
    const { container } = render(<CalendarBlockChip block={tenMinuteTask} variant="overlay" timezone={TZ} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("py-0");
    expect(root.className).toContain("flex-row");
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it("un bloque de dos horas muestra la escalera completa, igual que `timed`", () => {
    const twoHourTask = block({ end: "2026-08-05T12:00:00-03:00", projectName: "Trabajo", labels: [{ id: "l1", name: "Urgente", color: "amarillo" }] });
    render(<CalendarBlockChip block={twoHourTask} variant="overlay" timezone={TZ} />);
    expect(screen.getByText("10:00 – 12:00")).toBeInTheDocument();
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Urgente")).toBeInTheDocument();
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

// Defecto encontrado (no en la lista original de tareas): un bloque muy
// corto mide menos que lo que pide el primer peldaño de la escalera (relleno
// vertical + una línea de texto normal, 24px) — el contenido se recortaba en
// fragmentos ilegibles y el control de completar quedaba invisible. La
// salida es apretar, no agrandar (ningún alto mínimo): sin relleno vertical,
// tipografía más chica, una sola fila. A 96px/hora (pedido del dueño: subir
// el alto de la grilla) un bloque de 15 minutos —el paso mínimo de la
// grilla— mide justo esos 24px y ya no cae acá; el modo apretado queda para
// duraciones más cortas (una duración corta puesta a mano, o un evento
// importado de Google).
describe("CalendarBlockChip — modo apretado (defecto: un bloque muy corto era ilegible)", () => {
  it("un bloque de diez minutos va sin relleno vertical, en una sola fila, con tipografía más chica", () => {
    const tenMinuteTask = block({ end: "2026-08-05T10:10:00-03:00" });
    const { container } = render(<CalendarBlockChip block={tenMinuteTask} variant="timed" timezone={TZ} />);
    const root = container.querySelector('[role="button"]');
    expect(root?.className).toContain("py-0");
    expect(root?.className).toContain("flex-row");
    expect(root?.className).toContain("text-[0.625rem]");
  });

  it("un bloque de quince minutos —el paso mínimo de la grilla— ya no entra en modo apretado", () => {
    const { container } = render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    const root = container.querySelector('[role="button"]');
    expect(root?.className).toContain("py-1");
    expect(root?.className).toContain("flex-col");
    expect(root?.className).toContain("text-xs");
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
    const tenMinuteTask = block({ end: "2026-08-05T10:10:00-03:00" });
    render(<CalendarBlockChip block={tenMinuteTask} variant="timed" timezone={TZ} />);
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
  it("el `<button>` con el rol es el área tocable agrandada, no el punto que se ve (en modo apretado)", () => {
    const tenMinuteTask = block({ end: "2026-08-05T10:10:00-03:00" });
    render(<CalendarBlockChip block={tenMinuteTask} variant="timed" timezone={TZ} />);
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

// Pedido del dueño ("cuando señalemos una tarea o evento o hábito salga más
// info. Ahora cuando la señalo se muestra el título solamente"): el globo
// nativo (`title`) se reemplaza por una ficha propia (`Tooltip` de
// `@base-ui/react`, ya en la app) con el título completo y el resto de los
// datos del bloque — nunca en el bloque de vista previa ni en el `overlay`
// de arrastre, que no son interactivos.
describe("CalendarBlockChip — ficha de más info al señalar (reemplaza el globo nativo)", () => {
  it("saca el `title` nativo del bloque interactivo (timed): ya no compite con la ficha propia", () => {
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    expect(screen.getByRole("button", { name: "Escribir el informe" })).not.toHaveAttribute("title");
  });

  it("saca el `title` nativo del bloque compacto (mes)", () => {
    render(<CalendarBlockChip block={block()} variant="compact" timezone={TZ} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("title");
  });

  it("un bloque de vista previa conserva el `title` nativo: no es interactivo, no lleva ficha", () => {
    render(<CalendarBlockChip block={block({ isPreview: true })} variant="timed" timezone={TZ} />);
    expect(screen.getByTitle("Escribir el informe")).toBeInTheDocument();
  });

  it("al señalar, muestra el título completo (la razón del pedido: en el bloque se trunca)", async () => {
    const user = userEvent.setup();
    const longTitle = "Pagar el gas, registrar el gasto y el próximo pago con el banco";
    render(<CalendarBlockChip block={block({ title: longTitle })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: longTitle }));
    expect(await screen.findByText(longTitle)).toBeInTheDocument();
  });

  it("una tarea de todo el día muestra 'Todo el día' con la fecha", async () => {
    const user = userEvent.setup();
    render(
      <CalendarBlockChip
        block={block({ allDay: true, start: "2026-08-14", end: "2026-08-15" })}
        variant="timed"
        timezone={TZ}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Todo el día · vie 14 de ago")).toBeInTheDocument();
  });

  it("un bloque con horario muestra el rango, la duración y la fecha", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ end: "2026-08-05T10:30:00-03:00" })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("10:00 – 10:30 · 30 min · mié 5 de ago")).toBeInTheDocument();
  });

  it("muestra proyecto y sección de una tarea, separados por '›'", async () => {
    const user = userEvent.setup();
    render(
      <CalendarBlockChip
        block={block({ projectName: "Personal", projectIcon: "🧑", sectionName: "Pagos" })}
        variant="timed"
        timezone={TZ}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Personal › Pagos")).toBeInTheDocument();
  });

  it("muestra el calendario de origen de un evento", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ type: "event", calendarName: "Trabajo" })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Trabajo")).toBeInTheDocument();
  });

  it("muestra la prioridad de una tarea", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ priority: 2 })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Alta")).toBeInTheDocument();
  });

  it("muestra las etiquetas de una tarea", async () => {
    const user = userEvent.setup();
    render(
      <CalendarBlockChip
        block={block({ labels: [{ id: "l1", name: "Urgente", color: "amarillo" }] })}
        variant="timed"
        timezone={TZ}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Urgente")).toBeInTheDocument();
  });

  it("describe la recurrencia de una tarea en castellano, no la regla cruda", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=14" })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Todos los meses el 14")).toBeInTheDocument();
    expect(screen.queryByText(/FREQ=/)).not.toBeInTheDocument();
  });

  it("muestra la fecha límite de una tarea", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ deadline: "2026-08-16" })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Límite: 16 de agosto")).toBeInTheDocument();
  });

  it("muestra frecuencia y racha de un hábito", async () => {
    const user = userEvent.setup();
    render(
      <CalendarBlockChip
        block={block({ type: "habit", habitFrequencyText: "Todos los días", habitStreakText: "5 días" })}
        variant="timed"
        timezone={TZ}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Todos los días")).toBeInTheDocument();
    expect(screen.getByText("Racha: 5 días")).toBeInTheDocument();
  });

  it("dice el estado: una tarea completada, un hábito salteado", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ completed: true })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Completada")).toBeInTheDocument();
  });

  it("dice el estado de un hábito salteado", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block({ type: "habit", skipped: true })} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Salteado")).toBeInTheDocument();
  });

  it("muestra la descripción de un evento, primera línea, sin el resto", async () => {
    const user = userEvent.setup();
    render(
      <CalendarBlockChip
        block={block({ type: "event", description: "Primera línea de la descripción\nsegunda línea" })}
        variant="timed"
        timezone={TZ}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    expect(await screen.findByText("Primera línea de la descripción")).toBeInTheDocument();
    expect(screen.queryByText(/segunda línea/)).not.toBeInTheDocument();
  });

  it("una tarea sin etiquetas, límite, recurrencia ni descripción da una ficha corta, no una llena de huecos", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    // Espera a que la ficha termine de abrirse (algo que sí debería estar).
    await screen.findByText("10:00 – 10:15 · 15 min · mié 5 de ago");
    expect(screen.queryByText(/Límite:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Racha:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Todos los/)).not.toBeInTheDocument();
  });

  it("mientras se arrastra o redimensiona (`tooltipDisabled`), la ficha no se abre", async () => {
    const user = userEvent.setup();
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} tooltipDisabled />);
    await user.hover(screen.getByRole("button", { name: "Escribir el informe" }));
    // Da tiempo de sobra a la demora de apertura (400ms): si la ficha
    // fuera a abrirse, ya habría aparecido.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.queryByText("Todo el día", { exact: false })).not.toBeInTheDocument();
  });

  it("conecta la ficha con el bloque por `aria-describedby`, sin duplicar el nombre accesible", () => {
    render(<CalendarBlockChip block={block()} variant="timed" timezone={TZ} />);
    const root = screen.getByRole("button", { name: "Escribir el informe" });
    expect(root).toHaveAttribute("aria-describedby");
    // El nombre accesible sigue siendo solo el título, no el título repetido.
    expect(root.getAttribute("aria-label")).toBe("Escribir el informe");
  });
});
