// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { SectionList } from "./section-list";
import type { SectionRow } from "@/lib/sections/use-sections";

vi.mock("@/lib/supabase/client", () => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const eq = vi.fn();
  const update = vi.fn(() => ({ eq }));
  const deleteFn = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ insert, update, delete: deleteFn }));
  const getSession = vi.fn();
  return {
    createClient: () => ({ from, auth: { getSession } }),
    __mock: { from, insert, select, single, update, eq, delete: deleteFn, getSession },
  };
});

const { insert, single, update, eq, delete: deleteMock, getSession } = (
  supabaseClientModule as unknown as {
    __mock: {
      from: ReturnType<typeof vi.fn>;
      insert: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  }
).__mock;

const sections: SectionRow[] = [
  { id: "s1", project_id: "p1", name: "Por hacer", position: 1000, is_collapsed: false },
  { id: "s2", project_id: "p1", name: "Hecho", position: 2000, is_collapsed: false },
];

// `userEvent.click` no abre el menú de Base UI en jsdom (necesita el ciclo
// completo pointerdown/pointerup que jsdom no simula igual que un navegador
// real); un `fireEvent` explícito sí lo abre. Ver también los polyfills de
// `vitest.setup.ts`.
function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 });
  fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 });
  fireEvent.click(trigger);
}

function renderList(initialSections: SectionRow[] = sections) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <SectionList projectId="p1" initialSections={initialSections} />
    </QueryClientProvider>,
  );
}

describe("SectionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    single.mockResolvedValue({
      data: { id: "new-section", project_id: "p1", name: "Nueva", position: 3000, is_collapsed: false },
      error: null,
    });
    eq.mockResolvedValue({ error: null });
  });

  it("muestra el estado vacío y ofrece la acción cuando no hay secciones", () => {
    renderList([]);
    expect(
      screen.getByText(/todavía no tiene secciones. creá una para organizar las tareas/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar sección/i })).toBeInTheDocument();
  });

  it("crea una sección con el nombre escrito", async () => {
    const user = userEvent.setup();
    renderList([]);

    await user.click(screen.getByRole("button", { name: /agregar sección/i }));
    await user.type(screen.getByLabelText("Nombre de la nueva sección"), "En curso{Enter}");

    await waitFor(() => expect(insert).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", project_id: "p1", name: "En curso" }),
    );
  });

  it("renombra una sección existente", async () => {
    const user = userEvent.setup();
    renderList();

    openMenu(screen.getAllByRole("button", { name: /más acciones para la sección por hacer/i })[0]);
    await user.click(await screen.findByRole("menuitem", { name: "Renombrar" }));

    const input = screen.getByLabelText("Nombre de la sección");
    await user.clear(input);
    await user.type(input, "Pendientes{Enter}");

    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: "Pendientes" }));
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });

  it("elimina una sección sin pedir confirmación (sus tareas sobreviven en la base, no acá)", async () => {
    const user = userEvent.setup();
    renderList();

    openMenu(screen.getAllByRole("button", { name: /más acciones para la sección por hacer/i })[0]);
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    expect(eq).toHaveBeenCalledWith("id", "s1");
  });

  it("colapsa una sección al hacer clic en el chevron", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Contraer sección Por hacer" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ is_collapsed: true }));
  });
});
