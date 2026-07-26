// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNavigatorOnline } from "./use-navigator-online";

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function Probe() {
  const online = useNavigatorOnline();
  return createElement("div", null, online ? "conectado" : "sin conexión");
}

describe("useNavigatorOnline (D4, señal 1)", () => {
  afterEach(() => setNavigatorOnLine(true));

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

  it("el primer render del cliente coincide con el del servidor aunque ya esté offline, sin mismatch de hidratación", () => {
    // El servidor no tiene `navigator`: el snapshot de servidor de la
    // implementación es siempre "conectado". Simulamos ese HTML de servidor
    // e hidratamos en un cliente que ya está offline: si el primer render
    // del cliente leyera `navigator.onLine` directamente, este test
    // fallaría (era justo el bug: server "conectado" vs. cliente "sin
    // conexión" en el mismo render).
    const serverHtml = renderToString(createElement(Probe));
    expect(serverHtml).toContain("conectado");

    setNavigatorOnLine(false);

    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.appendChild(container);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    let root!: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(container, createElement(Probe));
    });

    // Ninguna advertencia de React por texto de hidratación distinto.
    expect(consoleError).not.toHaveBeenCalled();

    // Converge al estado real (offline) sin quedar pegado en "conectado".
    expect(container.textContent).toBe("sin conexión");

    consoleError.mockRestore();
    act(() => root.unmount());
    container.remove();
  });
});
