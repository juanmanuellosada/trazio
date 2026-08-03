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

function renderBar(
  overrides: Partial<ViewOptions> = {},
  props: { showViewShape?: boolean; showDaysAhead?: boolean; showCalendarFormat?: boolean; viewKey?: string } = {},
) {
  const viewKey = props.viewKey ?? "proyecto:1";
  currentOptions = { ...defaultOptionsForViewKey(viewKey), ...overrides };
  return render(
    <ViewOptionsBar
      viewKey={viewKey}
      initialOptions={currentOptions}
      showViewShape={props.showViewShape ?? true}
      showDaysAhead={props.showDaysAhead ?? false}
      showCalendarFormat={props.showCalendarFormat}
    />,
  );
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Formato/ }));
}

/** Elige una opción de un desplegable (patrón `FieldRow` + `Select`, tarea 3.1 fase 4): abre el combobox por su etiqueta y clickea la opción. */
async function chooseOption(user: ReturnType<typeof userEvent.setup>, comboboxName: string, optionName: string) {
  await user.click(screen.getByRole("combobox", { name: comboboxName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
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
    const combobox = screen.getByRole("combobox", { name: "Forma de ver" });
    expect(combobox).toBeInTheDocument();
    await user.click(combobox);
    expect(await screen.findByRole("option", { name: "Lista" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Calendario" })).toBeInTheDocument();
  });

  it("elegir calendario cambia viewShape", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);
    await chooseOption(user, "Forma de ver", "Calendario");
    expect(setOption).toHaveBeenCalledWith("viewShape", "calendario");
  });

  it("no ofrece el selector de forma de ver cuando showViewShape es false (Hoy, Etiqueta, Filtro)", async () => {
    const user = userEvent.setup();
    renderBar({}, { showViewShape: false });
    await openPanel(user);
    expect(screen.queryByRole("combobox", { name: "Forma de ver" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("combobox", { name: "Formato de calendario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /repeticiones futuras/i })).not.toBeInTheDocument();
  });

  it("no aparecen con la forma de ver en panel", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" });
    await openPanel(user);
    expect(screen.queryByRole("combobox", { name: "Formato de calendario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /repeticiones futuras/i })).not.toBeInTheDocument();
  });

  it("aparecen los dos con la forma de ver en calendario", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario" });
    await openPanel(user);
    expect(screen.getByRole("combobox", { name: "Formato de calendario" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /repeticiones futuras/i })).toBeInTheDocument();
  });

  it("no aparece con showCalendarFormat en false, ni con la forma de ver en calendario (Hoy, D-F)", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario" }, { showCalendarFormat: false });
    await openPanel(user);
    expect(screen.queryByRole("combobox", { name: "Formato de calendario" })).not.toBeInTheDocument();
    // No queda ni deshabilitado: directamente no está.
    expect(screen.queryByText("Formato de calendario")).not.toBeInTheDocument();
  });

  it("el formato de calendario ofrece día, 4 días, semana y mes, y elegir uno llama a setOption", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario", formato_calendario: "semana" });
    await openPanel(user);

    await user.click(screen.getByRole("combobox", { name: "Formato de calendario" }));
    expect(await screen.findByRole("option", { name: "Día" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "4 días" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Mes" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Mes" }));
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
    expect(screen.queryByRole("combobox", { name: "Días adelante" })).not.toBeInTheDocument();
  });

  it("ofrece los presets y elegir uno llama a setOption", async () => {
    const user = userEvent.setup();
    renderBar({ daysAhead: 14 }, { showDaysAhead: true });
    await openPanel(user);

    await chooseOption(user, "Días adelante", "30 días");
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

    await chooseOption(user, "Agrupar por", "Etiqueta");
    expect(setOption).toHaveBeenCalledWith("groupBy", "etiqueta");

    await chooseOption(user, "Ordenar por", "Fecha");
    expect(setOption).toHaveBeenCalledWith("order", "fecha");
  });

  it("los filtros rápidos de fecha límite y prioridad llaman a setQuickFilters", async () => {
    const user = userEvent.setup();
    renderBar();
    await openPanel(user);

    await chooseOption(user, "Fecha límite", "Con fecha límite");
    expect(setQuickFilters).toHaveBeenCalledWith({ deadline: "con" });

    await chooseOption(user, "Prioridad", "Urgente");
    expect(setQuickFilters).toHaveBeenCalledWith({ priority: 1 });
  });
});

describe("ViewOptionsBar — agrupar por: cada forma de ver ofrece lo que sabe manejar (D-B y su espejo, panel-con-columnas-por-campo)", () => {
  beforeEach(() => {
    setOption.mockClear();
  });

  it("en lista, agrupar por ofrece nada, prioridad y etiqueta, pero nunca sección ni fecha", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "lista" });
    await openPanel(user);
    await user.click(screen.getByRole("combobox", { name: "Agrupar por" }));
    expect(await screen.findByRole("option", { name: "Nada" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Prioridad" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Etiqueta" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sección" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Fecha" })).not.toBeInTheDocument();
  });

  it("en panel, agrupar por ofrece sección, fecha y prioridad, pero nunca etiqueta", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" });
    await openPanel(user);
    await user.click(screen.getByRole("combobox", { name: "Agrupar por" }));
    expect(await screen.findByRole("option", { name: "Sección" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fecha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Prioridad" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Etiqueta" })).not.toBeInTheDocument();
  });

  it("con la preferencia guardada en etiqueta, el panel la muestra como 'Nada' sin pisarla", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel", groupBy: "etiqueta" });
    await openPanel(user);
    expect(screen.getByRole("combobox", { name: "Agrupar por" })).toHaveTextContent("Nada");
  });

  it("con la preferencia guardada en sección o fecha (traída del panel), la lista la muestra como 'Nada' sin pisarla", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "lista", groupBy: "seccion" });
    await openPanel(user);
    expect(screen.getByRole("combobox", { name: "Agrupar por" })).toHaveTextContent("Nada");
  });

  it("elegir sección o fecha en el panel llama a setOption con el valor real", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" });
    await openPanel(user);

    await chooseOption(user, "Agrupar por", "Sección");
    expect(setOption).toHaveBeenCalledWith("groupBy", "seccion");

    await chooseOption(user, "Agrupar por", "Fecha");
    expect(setOption).toHaveBeenCalledWith("groupBy", "fecha");
  });
});

describe("ViewOptionsBar — Hoy y Próximos no ofrecen agrupar por sección en el panel (D-C, panel-con-columnas-por-campo)", () => {
  beforeEach(() => {
    setOption.mockClear();
  });

  it("en el panel de Hoy, agrupar por no ofrece sección, aunque sí fecha y prioridad", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" }, { viewKey: "hoy" });
    await openPanel(user);
    await user.click(screen.getByRole("combobox", { name: "Agrupar por" }));
    expect(await screen.findByRole("option", { name: "Fecha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Prioridad" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sección" })).not.toBeInTheDocument();
  });

  it("en el panel de Próximos, agrupar por no ofrece sección", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" }, { viewKey: "proximos" });
    await openPanel(user);
    await user.click(screen.getByRole("combobox", { name: "Agrupar por" }));
    expect(await screen.findByRole("option", { name: "Fecha" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sección" })).not.toBeInTheDocument();
  });

  it("en el panel de Bandeja y Proyecto, sección sigue ofreciéndose", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel" }, { viewKey: "bandeja" });
    await openPanel(user);
    await user.click(screen.getByRole("combobox", { name: "Agrupar por" }));
    expect(await screen.findByRole("option", { name: "Sección" })).toBeInTheDocument();
  });

  it("una preferencia guardada en 'sección' desde Bandeja se muestra como 'Nada' en el panel de Próximos, sin pisarla", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "panel", groupBy: "seccion" }, { viewKey: "proximos" });
    await openPanel(user);
    expect(screen.getByRole("combobox", { name: "Agrupar por" })).toHaveTextContent("Nada");
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
