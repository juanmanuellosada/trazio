import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { subscribeToRealtime } from "./subscribe";

vi.mock("./handlers", () => ({
  onTasksRealtimeEvent: vi.fn(),
  onProjectsRealtimeEvent: vi.fn(),
  onSectionsRealtimeEvent: vi.fn(),
  onCommentsRealtimeEvent: vi.fn(),
  onRemindersRealtimeEvent: vi.fn(),
  onFiltersRealtimeEvent: vi.fn(),
}));

/** Mock mínimo de un `SupabaseClient` real: alcanza para probar el armado de canales sin Realtime de verdad. */
function createSupabaseMock() {
  const channels: Array<{
    name: string;
    onArgs: unknown[];
    handler: () => void;
    subscribe: ReturnType<typeof vi.fn>;
  }> = [];

  const channel = vi.fn((name: string) => {
    const entry = { name, onArgs: [] as unknown[], handler: () => {}, subscribe: vi.fn() };
    const chain = {
      on: vi.fn((...args: unknown[]) => {
        entry.onArgs = args;
        entry.handler = args[2] as () => void;
        return chain;
      }),
      subscribe: vi.fn((cb: (status: string) => void) => {
        entry.subscribe(cb);
        cb("SUBSCRIBED");
        return chain;
      }),
    };
    channels.push(entry);
    return chain;
  });

  const removeChannel = vi.fn();

  return { channel, removeChannel, channels };
}

describe("subscribeToRealtime (10.1/10.2, sumado 4.5/4.10/2.12 de fase 2)", () => {
  it("suscribe exactamente tasks, projects, sections, comments, reminders y filters, filtrados por user_id — ninguna otra tabla", () => {
    const supabase = createSupabaseMock();
    const queryClient = new QueryClient();
    const onStatusChange = vi.fn();

    subscribeToRealtime(supabase as never, queryClient, "user-1", onStatusChange);

    const tables = supabase.channels.map((c) => (c.onArgs[1] as { table: string }).table);
    expect(tables.sort()).toEqual(["comments", "filters", "projects", "reminders", "sections", "tasks"]);

    for (const entry of supabase.channels) {
      const [event, config] = entry.onArgs as [string, { schema: string; filter: string }];
      expect(event).toBe("postgres_changes");
      expect(config.schema).toBe("public");
      expect(config.filter).toBe("user_id=eq.user-1");
    }
  });

  it("cada evento dispara el manejador de su propia tabla", async () => {
    const handlers = await import("./handlers");
    const supabase = createSupabaseMock();
    const queryClient = new QueryClient();

    subscribeToRealtime(supabase as never, queryClient, "user-1", vi.fn());

    for (const entry of supabase.channels) {
      entry.handler();
    }

    expect(handlers.onTasksRealtimeEvent).toHaveBeenCalledWith(queryClient);
    expect(handlers.onProjectsRealtimeEvent).toHaveBeenCalledWith(queryClient);
    expect(handlers.onSectionsRealtimeEvent).toHaveBeenCalledWith(queryClient);
    expect(handlers.onCommentsRealtimeEvent).toHaveBeenCalledWith(queryClient);
    expect(handlers.onRemindersRealtimeEvent).toHaveBeenCalledWith(queryClient);
    expect(handlers.onFiltersRealtimeEvent).toHaveBeenCalledWith(queryClient);
  });

  it("informa el status de cada canal al llamador", () => {
    const supabase = createSupabaseMock();
    const queryClient = new QueryClient();
    const onStatusChange = vi.fn();

    subscribeToRealtime(supabase as never, queryClient, "user-1", onStatusChange);

    expect(onStatusChange).toHaveBeenCalledTimes(6);
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.stringMatching(/tasks|projects|sections|comments|reminders|filters/),
      "SUBSCRIBED",
    );
  });

  it("la limpieza da de baja los seis canales, sin dejar ninguno colgado", () => {
    const supabase = createSupabaseMock();
    const queryClient = new QueryClient();

    const cleanup = subscribeToRealtime(supabase as never, queryClient, "user-1", vi.fn());
    cleanup();

    expect(supabase.removeChannel).toHaveBeenCalledTimes(6);
  });
});
