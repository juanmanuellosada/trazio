// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Label } from "@/lib/labels/use-labels";
import { defaultOptionsForViewKey, type ViewOptions } from "@/lib/view-options/schema";
import { ComposeContextProvider } from "@/components/tasks/compose-context";
import { LabelView } from "./label-view";

/**
 * Suite del grupo 3 de `etiquetas-con-lugar-propio`: el menú de acciones
 * del encabezado (favorita, editar, eliminar) y el redirect del bloque 3.5.
 * El resto de la pantalla (lista de tareas, agrupación, orden) no cambió
 * con esta tanda y no se vuelve a probar acá.
 */

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/labels/use-label-tasks", () => ({
  useLabelTasks: () => ({ data: [] }),
}));
// Pasa `initialLabels` tal cual, como haría react-query antes de que la
// query en red resuelva — alcanza para probar la derivación reactiva
// (D-D: `label` sale de esta lista, no del prop estático).
vi.mock("@/lib/labels/use-labels", () => ({
  useLabels: (initialData: Label[]) => ({ data: initialData }),
}));
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: (_key: string, initial: ViewOptions) => ({ options: initial }),
}));

const updateLabelMutate = vi.fn();
vi.mock("@/lib/labels/mutations", () => ({
  useUpdateLabel: () => ({ mutate: updateLabelMutate }),
}));

vi.mock("./label-form-dialog", () => ({
  LabelFormDialog: ({ open, label }: { open: boolean; label?: { name: string } }) =>
    open ? <div>Editando {label?.name}</div> : null,
}));
vi.mock("./delete-label-dialog", () => ({
  DeleteLabelDialog: ({ open, label }: { open: boolean; label: { name: string } }) =>
    open ? <div>Eliminando {label.name}</div> : null,
}));

const BASE_OPTIONS: ViewOptions = defaultOptionsForViewKey("etiqueta:label-1");

function label(overrides: Partial<Label> = {}): Label {
  return { id: "label-1", name: "Casa", color: "celeste", is_favorite: false, ...overrides };
}

function renderView(overrides: Partial<Label> = {}, initialLabels?: Label[]) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ComposeContextProvider>
        <LabelView
          labelId="label-1"
          initialLabels={initialLabels ?? [label(overrides)]}
          userId="user-1"
          timezone="America/Argentina/Buenos_Aires"
          initialTasks={[]}
          initialOptions={BASE_OPTIONS}
        />
      </ComposeContextProvider>
    </QueryClientProvider>,
  );
}

describe("LabelView — menú de acciones del encabezado", () => {
  beforeEach(() => {
    push.mockReset();
    updateLabelMutate.mockReset();
  });

  it("no muestra ícono ni punto de color junto al título (interfaz-descubrible)", () => {
    renderView();
    const heading = screen.getByRole("heading", { name: "Casa" });
    expect(heading.previousElementSibling).toBeNull();
    expect(document.querySelector('[style*="background-color"]')).not.toBeInTheDocument();
  });

  it("marca como favorita al hacer clic en la estrella", async () => {
    const user = userEvent.setup();
    renderView({ is_favorite: false });

    await user.click(screen.getByRole("button", { name: "Marcar como favorita" }));

    expect(updateLabelMutate).toHaveBeenCalledWith({ id: "label-1", patch: { is_favorite: true } });
  });

  it("ofrece desmarcar cuando ya es favorita", async () => {
    const user = userEvent.setup();
    renderView({ is_favorite: true });

    await user.click(screen.getByRole("button", { name: "Quitar de favoritos" }));

    expect(updateLabelMutate).toHaveBeenCalledWith({ id: "label-1", patch: { is_favorite: false } });
  });

  it("abre el diálogo de editar (renombrar y recolorear) desde el menú", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Más acciones de la etiqueta" }));
    await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

    expect(await screen.findByText("Editando Casa")).toBeInTheDocument();
  });

  it("abre la confirmación de eliminar desde el menú", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Más acciones de la etiqueta" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    expect(await screen.findByText("Eliminando Casa")).toBeInTheDocument();
  });

  it("navega a /etiquetas cuando la etiqueta que se está mirando ya no está (se eliminó)", async () => {
    renderView({}, []);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/etiquetas"));
    expect(screen.queryByRole("heading", { name: "Casa" })).not.toBeInTheDocument();
  });
});
