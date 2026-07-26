// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useNavigatorOnline } from "./use-navigator-online";

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("useNavigatorOnline (D4, señal 1)", () => {
  afterEach(() => setNavigatorOnLine(true));

  it("arranca con el valor actual de navigator.onLine", () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useNavigatorOnline());
    expect(result.current).toBe(false);
  });

  it("se actualiza con los eventos online/offline del navegador, sin polling", () => {
    setNavigatorOnLine(true);
    const { result } = renderHook(() => useNavigatorOnline());
    expect(result.current).toBe(true);

    act(() => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
