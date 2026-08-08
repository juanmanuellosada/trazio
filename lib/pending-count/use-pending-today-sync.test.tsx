// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePendingTodaySync } from "./use-pending-today-sync";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => mockUsePathname() }));

// `usePendingTodayCount` tiene su propia suite (`pending-today-count.test.ts`,
// tarea 1.4): acá interesa solo cómo este hook aplica el número al badge y
// al título, no cómo lo calcula.
const mockUsePendingTodayCount = vi.fn();
vi.mock("./pending-today-count", () => ({ usePendingTodayCount: () => mockUsePendingTodayCount() }));

describe("usePendingTodaySync — título del documento (tareas 2.1-2.3)", () => {
  beforeEach(() => {
    document.title = "Trazio";
    mockUsePathname.mockReturnValue("/hoy");
  });

  it("antepone (N) al título cuando hay pendientes", () => {
    mockUsePendingTodayCount.mockReturnValue(8);

    renderHook(() => usePendingTodaySync());

    expect(document.title).toBe("(8) Trazio");
  });

  it("no antepone nada sin pendientes", () => {
    mockUsePendingTodayCount.mockReturnValue(0);

    renderHook(() => usePendingTodaySync());

    expect(document.title).toBe("Trazio");
  });

  /**
   * Tarea 2.2/D-B (`design.md`): el `metadata` del App Router reescribe
   * `document.title` en cada navegación y se lleva puesto el número. Este
   * test simula justo eso — reescribe el título "a mano", como haría Next
   * al cambiar de ruta, y verifica que el hook lo reaplica al reaccionar al
   * cambio de `usePathname()`, sin acumular prefijos.
   */
  it("reaplica el número después de un cambio de ruta que reescribió el título", () => {
    mockUsePendingTodayCount.mockReturnValue(5);
    const { rerender } = renderHook(() => usePendingTodaySync());
    expect(document.title).toBe("(5) Trazio");

    document.title = "Próximos — Trazio";
    mockUsePathname.mockReturnValue("/proximos");
    rerender();

    expect(document.title).toBe("(5) Próximos — Trazio");
  });
});

describe("usePendingTodaySync — badge del ícono", () => {
  const originalSetAppBadge = (navigator as { setAppBadge?: unknown }).setAppBadge;
  const originalClearAppBadge = (navigator as { clearAppBadge?: unknown }).clearAppBadge;

  beforeEach(() => {
    document.title = "Trazio";
    mockUsePathname.mockReturnValue("/hoy");
  });

  afterEach(() => {
    Object.assign(navigator, { setAppBadge: originalSetAppBadge, clearAppBadge: originalClearAppBadge });
  });

  it("llama a setAppBadge con el total cuando la API está disponible y hay pendientes", () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { setAppBadge, clearAppBadge: vi.fn().mockResolvedValue(undefined) });
    mockUsePendingTodayCount.mockReturnValue(3);

    renderHook(() => usePendingTodaySync());

    expect(setAppBadge).toHaveBeenCalledWith(3);
  });

  it("llama a clearAppBadge cuando no hay pendientes", () => {
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { setAppBadge: vi.fn().mockResolvedValue(undefined), clearAppBadge });
    mockUsePendingTodayCount.mockReturnValue(0);

    renderHook(() => usePendingTodaySync());

    expect(clearAppBadge).toHaveBeenCalled();
  });
});
