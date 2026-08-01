// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultOptionsForViewKey, type ViewOptions } from "@/lib/view-options/schema";
import { ViewOptionsBar } from "./view-options-bar";

// `useLabels` corre TanStack Query; ajeno al propósito de estos tests
// (mismo criterio que `components/tasks/hoy-view.test.tsx`).
vi.mock("@/lib/labels/use-labels", () => ({
  useLabels: () => ({ data: [] }),
}));

const setOption = vi.fn();
const setQuickFilters = vi.fn();
const resetMock = vi.fn();
let currentOptions: ViewOptions;

// `useViewOptions` también corre TanStack Query (bloque 6.2); se reemplaza
// por un stub controlable, igual que `components/tasks/hoy-view.test.tsx`
// hace con el mismo hook.
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: () => ({
    options: currentOptions,
    setOption: (key: string, value: unknown) => setOption(key, value),
    setQuickFilters: (value: unknown) => setQuickFilters(value),
    reset: () => resetMock(),
  }),
}));

function renderBar(overrides: Partial<ViewOptions> = {}, props: { showViewShape?: boolean; showDaysAhead?: boolean } = {}) {
  currentOptions = { ...defaultOptionsForViewKey("proyecto:1"), ...overrides };
  return render(
    <ViewOptionsBar
      viewKey="proyecto:1"
      initialOptions={currentOptions}
      showViewShape={props.showViewShape ?? true}
      showDaysAhead={props.showDaysAhead ?? false}
    />,
  );
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Formato/ }));
}

describe("ViewOptionsBar — un único disparador que abre el panel (tarea 3.1, D-A)", () => {
  beforeEach(() => {
    setOption.mockClear();
    setQuickFilters.mockClear();
    resetMock.mockClear();
  });

  it("muestra un único disparador y el panel arranca cerrado", () => {
    renderBar();
    expect(screen.getByRole("button", { name: /^Formato/ })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abrir el disparador muestra las tres secciones", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vista" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orden" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Filtro" })).toBeInTheDocument();
  });

  it("la forma de ver está dentro del panel, con calendario como una de sus opciones", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);
    expect(screen.getByRole("radiogroup", { name: "Forma de ver" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Lista" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Calendario" })).toBeInTheDocument();
  });

  it("elegir calendario cambia viewShape", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);
    await user.click(screen.getByRole("radio", { name: "Calendario" }));
    expect(setOption).toHaveBeenCalledWith("viewShape", "calendario");
  });

  it("no ofrece el selector de forma de ver cuando showViewShape es false (Hoy, Etiqueta, Filtro)", async () => {
    const user = userEvent.setup();
    renderBar({}, { showViewShape: false });
    await openPanel(user);
    expect(screen.queryByRole("radiogroup", { name: "Forma de ver" })).not.toBeInTheDocument();
  });

  it("restablecer llama a reset", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);
    await user.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(resetMock).toHaveBeenCalled();
  });
});

describe("ViewOptionsBar — formato de calendario y repeticiones futuras (bloque 7.1/7.3)", () => {
  beforeEach(() => {
    setOption.mockClear();
  });

  it("no aparecen con la forma de ver en lista", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "lista" });
    await openPanel(user);
    expect(screen.queryByRole("radiogroup", { name: "Formato de calendario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /repeticiones futuras/i })).not.toBeInTheDocument();
  });

  it("no aparecen con la forma de ver en panel", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" });
    await openPanel(user);
    expect(screen.queryByRole("radiogroup", { name: "Formato de calendario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /repeticiones futuras/i })).not.toBeInTheDocument();
  });

  it("aparecen los dos con la forma de ver en calendario", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario" });
    await openPanel(user);
    expect(screen.getByRole("radiogroup", { name: "Formato de calendario" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /repeticiones futuras/i })).toBeInTheDocument();
  });

  it("el formato de calendario ofrece día, 4 días, semana y mes, y elegir uno llama a setOption", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario", formato_calendario: "semana" });
    await openPanel(user);

    expect(screen.getByRole("radio", { name: "Día" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "4 días" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mes" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Mes" }));
    expect(setOption).toHaveBeenCalledWith("formato_calendario", "mes");
  });

  it("repeticiones futuras alterna showFutureRecurrences", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario", showFutureRecurrences: false });
    await openPanel(user);

    await user.click(screen.getByRole("switch", { name: /repeticiones futuras/i }));
    expect(setOption).toHaveBeenCalledWith("showFutureRecurrences", true);
  });
});

describe("ViewOptionsBar — días adelante, solo en Próximos (bloque 6.3)", () => {
  beforeEach(() => {
    setOption.mockClear();
  });

  it("no aparece cuando showDaysAhead es false", async () => {
    const user = userEvent.setup();
    renderBar({}, { showDaysAhead: false });
    await openPanel(user);
    expect(screen.queryByRole("radiogroup", { name: "Días adelante" })).not.toBeInTheDocument();
  });

  it("ofrece los presets y elegir uno llama a setOption", async () => {
    const user = userEvent.setup();
    renderBar({ daysAhead: 14 }, { showDaysAhead: true });
    await openPanel(user);

    expect(screen.getByRole("radiogroup", { name: "Días adelante" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "30 días" }));
    expect(setOption).toHaveBeenCalledWith("daysAhead", 30);
  });
});

describe("ViewOptionsBar — orden y filtro (secciones Orden y Filtro, tareas 3.4/3.5)", () => {
  beforeEach(() => {
    setOption.mockClear();
    setQuickFilters.mockClear();
  });

  it("agrupar por y ordenar por llaman a setOption con sus valores", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);

    await user.click(screen.getByRole("radio", { name: "Etiqueta" }));
    expect(setOption).toHaveBeenCalledWith("groupBy", "etiqueta");

    await user.click(screen.getByRole("radio", { name: "Fecha" }));
    expect(setOption).toHaveBeenCalledWith("order", "fecha");
  });

  it("los filtros rápidos de fecha límite y prioridad llaman a setQuickFilters", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);

    await user.click(screen.getByRole("radio", { name: "Con fecha límite" }));
    expect(setQuickFilters).toHaveBeenCalledWith({ deadline: "con" });

    await user.click(screen.getByRole("radio", { name: /Urgente/ }));
    expect(setQuickFilters).toHaveBeenCalledWith({ priority: 1 });
  });
});

describe("ViewOptionsBar — el disparador indica opciones activas (D-A, spec 'El disparador indica cuándo hay opciones activas')", () => {
  beforeEach(() => {
    setOption.mockClear();
    setQuickFilters.mockClear();
  });

  it("no muestra indicación con los valores por defecto", () => {
    renderBar();
    expect(screen.getByRole("button", { name: "Formato" })).toBeInTheDocument();
  });

  it("muestra indicación cuando hay un filtro rápido activo", () => {
    renderBar({ quickFilters: { deadline: "cualquiera", priority: 1, labelId: null } });
    expect(screen.getByRole("button", { name: /Formato.*con opciones activas/ })).toBeInTheDocument();
  });

  it("muestra indicación cuando el orden no es el default", () => {
    renderBar({ order: "prioridad" });
    expect(screen.getByRole("button", { name: /Formato.*con opciones activas/ })).toBeInTheDocument();
  });

  it("muestra indicación cuando se ocultan las completadas", () => {
    renderBar({ showCompleted: false });
    expect(screen.getByRole("button", { name: /Formato.*con opciones activas/ })).toBeInTheDocument();
  });

  it("no cuenta la forma de ver ni el formato de calendario para la indicación", () => {
    renderBar({ viewShape: "calendario", formato_calendario: "mes", daysAhead: 60 });
    expect(screen.getByRole("button", { name: "Formato" })).toBeInTheDocument();
  });
});
