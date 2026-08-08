import { describe, expect, it } from "vitest";
import { cursorReducer, initialCursorState, type CursorState } from "./reducer";

const orderedIds = ["a", "b", "c", "d", "e"];

describe("cursorReducer — move (bloque 1.1/1.3)", () => {
  it("sin cursor, la flecha abajo señala la primera fila", () => {
    const next = cursorReducer(initialCursorState, { type: "move", direction: "down", orderedIds });
    expect(next.cursorId).toBe("a");
  });

  it("sin cursor, la flecha arriba señala la última fila", () => {
    const next = cursorReducer(initialCursorState, { type: "move", direction: "up", orderedIds });
    expect(next.cursorId).toBe("e");
  });

  it("abajo avanza una posición", () => {
    const state: CursorState = { cursorId: "b" };
    const next = cursorReducer(state, { type: "move", direction: "down", orderedIds });
    expect(next.cursorId).toBe("c");
  });

  it("arriba retrocede una posición", () => {
    const state: CursorState = { cursorId: "c" };
    const next = cursorReducer(state, { type: "move", direction: "up", orderedIds });
    expect(next.cursorId).toBe("b");
  });

  it("el cursor no da la vuelta al pasarse de la última fila", () => {
    const state: CursorState = { cursorId: "e" };
    const next = cursorReducer(state, { type: "move", direction: "down", orderedIds });
    expect(next.cursorId).toBe("e");
  });

  it("el cursor no da la vuelta al pasarse de la primera fila", () => {
    const state: CursorState = { cursorId: "a" };
    const next = cursorReducer(state, { type: "move", direction: "up", orderedIds });
    expect(next.cursorId).toBe("a");
  });

  it("Inicio va a la primera fila desde cualquier posición", () => {
    const state: CursorState = { cursorId: "d" };
    const next = cursorReducer(state, { type: "move", direction: "first", orderedIds });
    expect(next.cursorId).toBe("a");
  });

  it("Fin va a la última fila desde cualquier posición", () => {
    const state: CursorState = { cursorId: "b" };
    const next = cursorReducer(state, { type: "move", direction: "last", orderedIds });
    expect(next.cursorId).toBe("e");
  });

  it("una lista vacía nunca deja cursor, sin importar la dirección", () => {
    const next = cursorReducer({ cursorId: "a" }, { type: "move", direction: "down", orderedIds: [] });
    expect(next.cursorId).toBeNull();
  });

  it("un cursorId que ya no está en orderedIds se trata como si no hubiera cursor", () => {
    const state: CursorState = { cursorId: "z" };
    const next = cursorReducer(state, { type: "move", direction: "down", orderedIds });
    expect(next.cursorId).toBe("a");
  });
});

describe("cursorReducer — set y clear", () => {
  it("set señala la fila clickeada", () => {
    const next = cursorReducer(initialCursorState, { type: "set", id: "c", orderedIds });
    expect(next.cursorId).toBe("c");
  });

  it("set ignora un id que no está en la lista actual", () => {
    const state: CursorState = { cursorId: "b" };
    const next = cursorReducer(state, { type: "set", id: "z", orderedIds });
    expect(next.cursorId).toBe("b");
  });

  it("clear deja la lista sin cursor", () => {
    const state: CursorState = { cursorId: "c" };
    const next = cursorReducer(state, { type: "clear", orderedIds });
    expect(next.cursorId).toBeNull();
  });
});

describe("cursorReducer — reconcile (D-C: la lista cambia debajo del cursor)", () => {
  it("completar la fila señalada deja el cursor en la fila que pasó a ocupar esa posición", () => {
    // Cursor en la tercera fila ("c"); "c" se completa y sale de la lista.
    const state: CursorState = { cursorId: "c" };
    const previousOrderedIds = ["a", "b", "c", "d", "e"];
    const nextOrderedIds = ["a", "b", "d", "e"]; // "d" pasó a ocupar la tercera posición
    const next = cursorReducer(state, { type: "reconcile", orderedIds: nextOrderedIds, previousOrderedIds });
    expect(next.cursorId).toBe("d");
  });

  it("completar varias filas seguidas mantiene el cursor sin volver al mouse", () => {
    let state: CursorState = { cursorId: "a" };
    let previous = ["a", "b", "c", "d"];

    // Se completa "a": desaparece, el cursor pasa a quien ocupa su lugar.
    let current = ["b", "c", "d"];
    state = cursorReducer(state, { type: "reconcile", orderedIds: current, previousOrderedIds: previous });
    expect(state.cursorId).toBe("b");

    // Se completa "b" de la misma manera.
    previous = current;
    current = ["c", "d"];
    state = cursorReducer(state, { type: "reconcile", orderedIds: current, previousOrderedIds: previous });
    expect(state.cursorId).toBe("c");
  });

  it("reordenar por realtime no arrastra el cursor a otro lado", () => {
    // "c" pasa de la tercera a la primera posición, pero sigue en la lista.
    const state: CursorState = { cursorId: "c" };
    const previousOrderedIds = ["a", "b", "c", "d", "e"];
    const nextOrderedIds = ["c", "a", "b", "d", "e"];
    const next = cursorReducer(state, { type: "reconcile", orderedIds: nextOrderedIds, previousOrderedIds });
    expect(next.cursorId).toBe("c");
  });

  it("borrar la última fila lleva el cursor a la que quedó última", () => {
    const state: CursorState = { cursorId: "e" };
    const previousOrderedIds = ["a", "b", "c", "d", "e"];
    const nextOrderedIds = ["a", "b", "c", "d"];
    const next = cursorReducer(state, { type: "reconcile", orderedIds: nextOrderedIds, previousOrderedIds });
    expect(next.cursorId).toBe("d");
  });

  it("vaciar la lista deja sin cursor", () => {
    const state: CursorState = { cursorId: "a" };
    const next = cursorReducer(state, { type: "reconcile", orderedIds: [], previousOrderedIds: ["a"] });
    expect(next.cursorId).toBeNull();
  });

  it("sin cursor previo, reconcile no hace nada", () => {
    const next = cursorReducer(initialCursorState, { type: "reconcile", orderedIds, previousOrderedIds: orderedIds });
    expect(next.cursorId).toBeNull();
  });
});
