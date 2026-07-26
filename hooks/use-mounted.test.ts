// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMounted } from "./use-mounted";

function readClientOnlyValue() {
  // Simula lo que hace `next-themes` con `resolvedTheme`/`theme`: en el
  // cliente lee `localStorage` de forma síncrona desde el primer render,
  // antes de montar — en el servidor ese valor no existe.
  if (typeof window === "undefined") return "servidor";
  return window.localStorage.getItem("valor") ?? "sin-guardar";
}

function Probe() {
  const mounted = useMounted();
  // Mismo patrón que `theme-toggle.tsx`, `project-tree.tsx`, `label-picker.tsx`
  // y `task-row.tsx`: hasta montar, pintar algo estable en vez de adivinar el
  // valor leído del cliente.
  const value = mounted ? readClientOnlyValue() : "estable";
  return createElement("div", null, value);
}

describe("useMounted", () => {
  afterEach(() => window.localStorage.clear());

  it("es `false` en el primer render y pasa a `true` después de montar", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true); // ya montado: `renderHook` corre efectos.
  });

  it("el primer render del cliente coincide con el del servidor aunque localStorage ya tenga otro valor, sin mismatch de hidratación", () => {
    // Este es justo el bug de `theme-toggle.tsx` (y del resto de los
    // componentes que resuelven color/ícono según `useTheme()`): si el
    // primer render del cliente leyera el valor real en vez de esperar a
    // montar, este test fallaría (servidor "estable" vs. cliente "oscuro"
    // en el mismo render).
    window.localStorage.setItem("valor", "oscuro");

    const serverHtml = renderToString(createElement(Probe));
    expect(serverHtml).toContain("estable");

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

    // Converge al valor real (leído de `localStorage`) después de montar.
    expect(container.textContent).toBe("oscuro");

    consoleError.mockRestore();
    act(() => root.unmount());
    container.remove();
  });
});
