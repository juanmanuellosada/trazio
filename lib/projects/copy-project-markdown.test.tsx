// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ProjectRow } from "@/lib/projects/use-projects";
import type { SectionRow } from "@/lib/sections/use-sections";
import { sectionsQueryKey } from "@/lib/sections/use-sections";
import type { TaskRow } from "@/lib/tasks/task-columns";
import { tasksQueryKey } from "@/lib/tasks/use-tasks";
import { projectToMarkdown } from "@/lib/projects/project-to-markdown";
import { copyProjectMarkdown, prefetchProjectMarkdownSources } from "./copy-project-markdown";
import { taskDescriptionsQueryKey } from "./task-descriptions";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

class MockClipboardItem {
  constructor(readonly data: Record<string, string | Blob | PromiseLike<string | Blob>>) {}
}

/** Igual que `realisticWrite` de `lib/clipboard/copy-text.test.tsx`: espera cada blob, así un rechazo de `buildText` también hace rechazar a `write`. */
function realisticWrite() {
  return vi.fn(async (items: MockClipboardItem[]) => {
    for (const item of items) {
      for (const value of Object.values(item.data)) {
        await value;
      }
    }
  });
}

function stubClipboard(overrides: { write?: ReturnType<typeof vi.fn> } = {}) {
  vi.stubGlobal("ClipboardItem", MockClipboardItem);
  const write = overrides.write ?? realisticWrite();
  Object.defineProperty(navigator, "clipboard", {
    value: { write, writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
  return { write };
}

/** Mock de Supabase: solo responde `tasks.select("id, description")`, para probar que tareas y secciones nunca salen a la red (vienen del caché). */
function createSupabaseMock(rows: { id: string; description: null }[]) {
  const calls: { table: string; select?: string; eqCol?: string; eqVal?: string; orderCol?: string; orderOpts?: unknown }[] = [];

  const from = vi.fn((table: string) => {
    const call = { table } as (typeof calls)[number];
    calls.push(call);
    return {
      select: vi.fn((cols: string) => {
        call.select = cols;
        return {
          eq: vi.fn((col: string, val: string) => {
            call.eqCol = col;
            call.eqVal = val;
            return {
              order: vi.fn((col2: string, opts: unknown) => {
                call.orderCol = col2;
                call.orderOpts = opts;
                return Promise.resolve({ data: rows, error: null });
              }),
            };
          }),
        };
      }),
    };
  });

  return { from, calls };
}

function projectRow(overrides: Partial<ProjectRow> & { id: string; name: string }): ProjectRow {
  return {
    color: null,
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    is_example: false,
    position: 0,
    ...overrides,
  };
}

function sectionRow(overrides: Partial<SectionRow> & { id: string }): SectionRow {
  return { project_id: "p1", name: "Sección", description: null, position: 0, is_collapsed: false, ...overrides };
}

function taskRow(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    project_id: "p1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 0,
    labels: [],
    ...overrides,
  };
}

const project = projectRow({ id: "p1", name: "Proyecto Test" });
const sections: SectionRow[] = [sectionRow({ id: "s1", name: "Sección A", position: 0 })];
const tasks: TaskRow[] = [taskRow({ id: "t1", section_id: "s1", title: "Tarea 1", position: 0 })];

function seededQueryClient() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(tasksQueryKey(project.id), tasks);
  queryClient.setQueryData(sectionsQueryKey(project.id), sections);
  return queryClient;
}

describe("copyProjectMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("camino feliz: escribe el markdown esperado en el portapapeles y avisa con toastSuccess", async () => {
    const { from } = createSupabaseMock([{ id: "t1", description: null }]);
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    const { write } = stubClipboard();
    const queryClient = seededQueryClient();

    await copyProjectMarkdown(queryClient, project);

    const expected = projectToMarkdown({ project, sections, tasks, descriptions: { t1: null } });
    const [items] = write.mock.calls[0] as [MockClipboardItem[]];
    const written = await items[0].data["text/plain"];
    const text = typeof written === "string" ? written : await written.text();
    expect(text).toBe(expected);
    expect(toastSuccess).toHaveBeenCalledWith("Proyecto copiado como markdown.");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("usa tareas y secciones del caché sin ir a la red por ellas: el mock de Supabase solo recibe la consulta de descripciones", async () => {
    const { from, calls } = createSupabaseMock([{ id: "t1", description: null }]);
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    stubClipboard();
    const queryClient = seededQueryClient();

    await copyProjectMarkdown(queryClient, project);

    expect(from).toHaveBeenCalledTimes(1);
    expect(calls[0]?.table).toBe("tasks");
    expect(calls[0]?.select).toBe("id, description");
  });

  it("la consulta de descripciones pide id, description, filtra por project_id y ordena por position", async () => {
    const { from, calls } = createSupabaseMock([{ id: "t1", description: null }]);
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    stubClipboard();
    const queryClient = seededQueryClient();

    await copyProjectMarkdown(queryClient, project);

    expect(calls[0]?.select).toBe("id, description");
    expect(calls[0]?.eqCol).toBe("project_id");
    expect(calls[0]?.eqVal).toBe(project.id);
    expect(calls[0]?.orderCol).toBe("position");
    expect(calls[0]?.orderOpts).toEqual({ ascending: true });
  });

  it("si falla la consulta de descripciones, avisa con el toastError de datos y no el de portapapeles", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: new Error("network") })),
        })),
      })),
    }));
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    // `write` sí se llama (D-D: sincrónico, con el blob diferido) — lo que importa acá es a qué toastError lleva el fracaso de `buildText`.
    stubClipboard();
    const queryClient = seededQueryClient();

    await copyProjectMarkdown(queryClient, project);

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos copiar el proyecto",
      "no se pudieron traer las descripciones de las tareas",
      "Revisá tu conexión y volvé a intentar.",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("si el navegador niega el portapapeles, avisa con el toastError de portapapeles", async () => {
    const { from } = createSupabaseMock([{ id: "t1", description: null }]);
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    stubClipboard({ write: vi.fn().mockRejectedValue(new Error("denied")) });
    const queryClient = seededQueryClient();

    await copyProjectMarkdown(queryClient, project);

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos usar el portapapeles",
      "el navegador no dio acceso a él",
      "Revisá los permisos del sitio y volvé a intentar.",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe("prefetchProjectMarkdownSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deja las descripciones en el caché", async () => {
    const { from } = createSupabaseMock([{ id: "t1", description: null }]);
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    const queryClient = new QueryClient();

    prefetchProjectMarkdownSources(queryClient, project.id);
    await vi.waitFor(() => expect(queryClient.getQueryData(taskDescriptionsQueryKey(project.id))).toEqual({ t1: null }));
  });

  it("no lanza si la consulta de descripciones falla", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: new Error("network") })),
        })),
      })),
    }));
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from }));
    const queryClient = new QueryClient();

    expect(() => prefetchProjectMarkdownSources(queryClient, project.id)).not.toThrow();
    await vi.waitFor(() => expect(from).toHaveBeenCalledTimes(1));
  });
});
