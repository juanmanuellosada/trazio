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
let currentOptions: ViewOptions;

// `useViewOptions` también corre TanStack Query (bloque 6.2); se reemplaza
// por un stub controlable, igual que `components/tasks/hoy-view.test.tsx`
// hace con el mismo hook.
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: () => ({
    options: currentOptions,
    setOption: (key: string, value: unknown) => setOption(key, value),
    setQuickFilters: vi.fn(),
    reset: vi.fn(),
  }),
}));

function renderBar(overrides: Partial<ViewOptions> = {}) {
  currentOptions = { ...defaultOptionsForViewKey("proyecto:1"), ...overrides };
  return render(
    <ViewOptionsBar viewKey="proyecto:1" initialOptions={currentOptions} showViewShape showDaysAhead={false} />,
  );
}

describe("ViewOptionsBar — calendario como forma de ver (bloque 7.1, spec opciones-de-vista)", () => {
  beforeEach(() => {
    setOption.mockClear();
  });

  it("ofrece calendario junto a lista y panel", () => {
    renderBar();
    expect(screen.getByRole("radiogroup", { name: "Forma de ver" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ver en lista" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ver en panel" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ver en calendario" })).toBeInTheDocument();
  });

  it("elegir calendario cambia viewShape", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("radio", { name: "Ver en calendario" }));
    expect(setOption).toHaveBeenCalledWith("viewShape", "calendario");
  });

  it("no ofrece el selector de forma de ver cuando showViewShape es false (Hoy, Etiqueta, Filtro)", () => {
    currentOptions = defaultOptionsForViewKey("hoy");
    render(<ViewOptionsBar viewKey="hoy" initialOptions={currentOptions} showViewShape={false} showDaysAhead={false} />);
    expect(screen.queryByRole("radiogroup", { name: "Forma de ver" })).not.toBeInTheDocument();
  });
});

describe("ViewOptionsBar — formato de calendario y repeticiones futuras (bloque 7.1/7.3)", () => {
  beforeEach(() => {
    setOption.mockClear();
  });

  it("no aparecen con la forma de ver en lista", () => {
    renderBar({ viewShape: "lista" });
    expect(screen.queryByRole("button", { name: /formato de calendario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /repeticiones futuras/i })).not.toBeInTheDocument();
  });

  it("no aparecen con la forma de ver en panel", () => {
    renderBar({ viewShape: "panel" });
    expect(screen.queryByRole("button", { name: /formato de calendario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /repeticiones futuras/i })).not.toBeInTheDocument();
  });

  it("aparecen los dos con la forma de ver en calendario", () => {
    renderBar({ viewShape: "calendario" });
    expect(screen.getByRole("button", { name: /formato de calendario/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /repeticiones futuras/i })).toBeInTheDocument();
  });

  it("el formato de calendario ofrece día, 4 días, semana y mes, y elegir uno llama a setOption", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario", formato_calendario: "semana" });

    await user.click(screen.getByRole("button", { name: /formato de calendario/i }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Día" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "4 días" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Mes" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Mes" }));
    expect(setOption).toHaveBeenCalledWith("formato_calendario", "mes");
  });

  it("repeticiones futuras alterna showFutureRecurrences", async () => {
    const user = userEvent.setup();
    renderBar({ viewShape: "calendario", showFutureRecurrences: false });

    await user.click(screen.getByRole("button", { name: /repeticiones futuras/i }));
    expect(setOption).toHaveBeenCalledWith("showFutureRecurrences", true);
  });
});
