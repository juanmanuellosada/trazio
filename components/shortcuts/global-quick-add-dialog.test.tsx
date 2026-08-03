// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { ComposeContextProvider, usePublishComposeContext, type ComposeContext } from "@/components/tasks/compose-context";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import { GlobalQuickAddDialog } from "./global-quick-add-dialog";

/**
 * Tests de la cadena de destino que resuelve el diálogo compartido por el
 * botón del panel lateral y el atajo `Q` (`alta-de-tareas-en-contexto`,
 * D-A/D-B): contexto de la vista, proyecto por defecto de las preferencias,
 * Bandeja de entrada, en ese orden. El comportamiento del composer en sí
 * (plegado, parser, etc.) ya lo prueba `task-quick-add-row.test.tsx`; el
 * montaje desde cada disparador, `sidebar-add-task.test.tsx` y
 * `shortcut-provider.test.tsx` — acá solo la resolución de destino.
 */

const PROJECTS = [
  {
    id: "inbox",
    name: "Bandeja de entrada",
    color: null,
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: true,
    is_favorite: false,
    is_archived: false,
    position: 0,
  },
  {
    id: "p2",
    name: "Trabajo",
    color: "celeste",
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    position: 1,
  },
];
const SECTIONS = [{ id: "sec1", project_id: "p2", name: "En curso" }];

function chain(result: unknown) {
  const self: Record<string, unknown> = {
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    select: vi.fn(() => self),
    then: (resolve: (value: unknown) => void) => {
      setTimeout(() => resolve(result), 0);
    },
  };
  return self;
}

function dataFor(table: string): unknown {
  if (table === "projects") return PROJECTS;
  if (table === "sections") return SECTIONS;
  return [];
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: vi.fn((table: string) => ({ select: vi.fn(() => chain({ data: dataFor(table), error: null })) })),
}));

const BASE_PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

/** Publica un contexto de vista fijo, como haría cualquier vista real con `usePublishComposeContext`. */
function ViewContextHarness({ context }: { context: ComposeContext }) {
  usePublishComposeContext(context);
  return null;
}

function renderDialog({
  viewContext,
  preferences = BASE_PREFERENCES,
  inboxProjectId = "inbox",
}: {
  viewContext: ComposeContext;
  preferences?: UserPreferences;
  inboxProjectId?: string | null;
}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={preferences}>
        <TaskDetailProvider>
          <ComposeContextProvider>
            <ViewContextHarness context={viewContext} />
            <GlobalQuickAddDialog open onOpenChange={() => {}} inboxProjectId={inboxProjectId} />
          </ComposeContextProvider>
        </TaskDetailProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

const NO_CONTEXT: ComposeContext = { projectId: null, sectionId: null, defaultDueDate: null };

describe("GlobalQuickAddDialog — cadena de destino (D-B)", () => {
  it("sin contexto de vista y sin proyecto por defecto, cae en Bandeja de entrada", async () => {
    renderDialog({ viewContext: NO_CONTEXT });

    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Bandeja de entrada"));
  });

  it("el contexto de la vista gana: parado en un proyecto, ese es el destino", async () => {
    renderDialog({ viewContext: { projectId: "p2", sectionId: null, defaultDueDate: null } });

    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Trabajo"));
  });

  it("nunca hereda la sección del contexto de la vista: el destino queda en el proyecto, no en la sección", async () => {
    // Reporte del dueño (2026-08-03): parado en una sección de un proyecto,
    // `Q` y el botón del panel lateral tienen que ofrecer el proyecto en su
    // raíz, no la sección — elegirla es una decisión explícita del selector.
    renderDialog({ viewContext: { projectId: "p2", sectionId: "sec1", defaultDueDate: null } });

    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Trabajo"));
  });

  it("sin contexto de vista, usa el proyecto por defecto de las preferencias antes que Bandeja", async () => {
    renderDialog({ viewContext: NO_CONTEXT, preferences: { ...BASE_PREFERENCES, defaultProjectId: "p2" } });

    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Trabajo"));
  });

  it("el contexto de la vista le gana al proyecto por defecto de las preferencias", async () => {
    renderDialog({
      viewContext: { projectId: "inbox", sectionId: null, defaultDueDate: null },
      preferences: { ...BASE_PREFERENCES, defaultProjectId: "p2" },
    });

    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Bandeja de entrada"));
  });

  it("hereda la fecha del contexto de la vista (Hoy y Próximos), visible al desplegar", async () => {
    const user = userEvent.setup();
    renderDialog({ viewContext: { projectId: null, sectionId: null, defaultDueDate: "2026-08-05" } });

    await user.click(await screen.findByRole("button", { name: "Mostrar más campos" }));

    const dateTrigger = screen.getByRole("button", { name: "Fecha de vencimiento" });
    expect(dateTrigger).not.toHaveTextContent("Agregar fecha");
  });
});
