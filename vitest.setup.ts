import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta el árbol de React entre tests: sin esto, cada `it()` de un mismo
// archivo de componente acumula el DOM del anterior y las queries de
// Testing Library (`getByLabelText`, etc.) empiezan a matchear duplicados.
afterEach(() => {
  cleanup();
});
