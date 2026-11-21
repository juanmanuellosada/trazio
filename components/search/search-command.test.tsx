// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchCommand } from "./search-command";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/search/use-search", () => ({ useSearch: () => ({ status: "fallo" }) }));
vi.mock("@/lib/search/use-recent-tasks", () => ({ useRecentTasks: () => ({ tasks: [], isLoading: false }) }));
vi.mock("@/components/tasks/task-detail-context", () => ({ useTaskDetail: () => ({ open: vi.fn() }) }));
vi.mock("@/components/filters/filter-form-dialog", () => ({ FilterFormDialog: () => null }));

// jsdom no trae ResizeObserver ni scrollIntoView, que `cmdk` usa.
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();

describe("SearchCommand — búsqueda fallida", () => {
  it("avisa que no se pudo completar la búsqueda en vez de quedarse en Buscando…", () => {
    render(<SearchCommand />);
    // `showRecent` depende del término: lo escribimos para ver el grupo de resultados.
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "reunion" } });

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos completar la búsqueda");
    expect(screen.queryByText("Buscando…")).toBeNull();
  });
});
