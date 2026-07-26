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
}
