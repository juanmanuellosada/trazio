import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta el árbol de React entre tests: sin esto, cada `it()` de un mismo
// archivo de componente acumula el DOM del anterior y las queries de
// Testing Library (`getByLabelText`, etc.) empiezan a matchear duplicados.
afterEach(() => {
  cleanup();
});

// jsdom no implementa estos métodos, que los menús y diálogos de Base UI
// (`@base-ui/react`, usado por `components/ui/dropdown-menu.tsx`,
// `dialog.tsx`, etc.) invocan al abrir/cerrar. Sin el stub, la llamada tira
// y el popup nunca llega a abrirse en los tests de componente (bloque 6).
// Este archivo de setup corre también para los tests en entorno "node"
// (sin DOM), así que el parche se aplica solo cuando `Element` existe.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  // jsdom no implementa `scrollTo`, que el desplazamiento continuo del
  // calendario usa para reposicionar `scrollLeft`/`scrollTop` cuando cambia
  // el día visible desde afuera (`use-continuous-scroll.ts`, tarea 6). Sin
  // el stub, montar `TimeGrid` tira "container.scrollTo is not a function".
  // Se aplican `left`/`top` directo a las propiedades (jsdom sí las deja
  // escribir, aunque no haga layout real): sin eso, los tests de
  // `time-grid.test.tsx` que verifican la posición resultante no tendrían
  // nada que leer.
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function scrollTo(this: Element, ...args: unknown[]) {
      const options = typeof args[0] === "object" && args[0] !== null ? (args[0] as { left?: number; top?: number }) : { left: args[0] as number, top: args[1] as number };
      if (typeof options.left === "number") this.scrollLeft = options.left;
      if (typeof options.top === "number") this.scrollTop = options.top;
    };
  }
}

// jsdom no implementa `matchMedia`, que `useMediaQuery` (bloque 7.10, y ahora
// `task-row.tsx` para el corte mobile del bloque 6) usa para decidir el
// layout. Sin el stub, cualquier componente que lo llame tira al montar.
// Por defecto no matchea nada (equivalente a "escritorio"), que es lo que
// asumen los tests existentes; un test puede reasignar `window.matchMedia`
// puntualmente si necesita simular mobile.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom tampoco implementa `ResizeObserver`, que `cmdk` (detrás de
// `components/ui/command.tsx`, el combobox de zona horaria del bloque 11)
// usa para medir la lista filtrada. Sin el stub, montar el componente tira.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom no implementa `Range.getClientRects`/`getBoundingClientRect` (no
// hace layout real): Tiptap/ProseMirror los usa para calcular la posición
// del cursor cada vez que el editor de descripción recibe foco
// (`EditorView.scrollToSelection`, bloque 7). Sin el stub, cualquier
// `.chain().focus()...run()` sobre un editor con contenido tira
// "getClientRects is not a function" en medio del test.
if (typeof Range !== "undefined") {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} }) as DOMRect;
  }
}
