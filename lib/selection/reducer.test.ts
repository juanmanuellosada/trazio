import { describe, expect, it } from "vitest";
import { initialSelectionState, selectionReducer, type SelectionState } from "./reducer";

describe("selectionReducer — toggle (bloques 7.10/7.11)", () => {
  it("un clic en el casillero activa el modo y selecciona esa tarea", () => {
    const next = selectionReducer(initialSelectionState, { type: "toggle", id: "t1" });
    expect(next.active).toBe(true);
    expect([...next.selected]).toEqual(["t1"]);
  });

  it("clic en otro casillero suma a la selección", () => {
    const state = selectionReducer(initialSelectionState, { type: "toggle", id: "t1" });
    const next = selectionReducer(state, { type: "toggle", id: "t2" });
    expect(next.selected.size).toBe(2);
  });

  it("clic en un casillero ya seleccionado lo saca de la selección", () => {
    let state = selectionReducer(initialSelectionState, { type: "toggle", id: "t1" });
    state = selectionReducer(state, { type: "toggle", id: "t2" });
    const next = selectionReducer(state, { type: "toggle", id: "t1" });
    expect([...next.selected]).toEqual(["t2"]);
    expect(next.active).toBe(true);
  });

  it("deseleccionar la última tarea sale del modo automáticamente", () => {
    const state = selectionReducer(initialSelectionState, { type: "toggle", id: "t1" });
    const next = selectionReducer(state, { type: "toggle", id: "t1" });
    expect(next.active).toBe(false);
    expect(next.selected.size).toBe(0);
  });
});

describe("selectionReducer — range (Shift+clic, requirement de rango)", () => {
  const orderedIds = ["a", "b", "c", "d", "e", "f", "g"];

  it("selecciona un rango completo entre el ancla y la tarea clickeada, inclusive", () => {
    let state = selectionReducer(initialSelectionState, { type: "toggle", id: "c" }); // tercera posición
    state = selectionReducer(state, { type: "range", id: "g", orderedIds }); // séptima posición
    expect([...state.selected].sort()).toEqual(["c", "d", "e", "f", "g"]);
  });

  it("el rango funciona en cualquier dirección (clic adelante, luego shift+clic atrás)", () => {
    let state = selectionReducer(initialSelectionState, { type: "toggle", id: "e" });
    state = selectionReducer(state, { type: "range", id: "b", orderedIds });
    expect([...state.selected].sort()).toEqual(["b", "c", "d", "e"]);
  });

  it("sin ancla previa, un Shift+clic se comporta como un clic simple", () => {
    const state = selectionReducer(initialSelectionState, { type: "range", id: "d", orderedIds });
    expect([...state.selected]).toEqual(["d"]);
    expect(state.active).toBe(true);
  });
});

describe("selectionReducer — selectAll y clear", () => {
  it("selectAll selecciona todas las tareas visibles", () => {
    const state = selectionReducer(initialSelectionState, { type: "selectAll", ids: Array.from({ length: 15 }, (_, i) => `t${i}`) });
    expect(state.selected.size).toBe(15);
    expect(state.active).toBe(true);
  });

  it("clear deselecciona todo y sale del modo (Escape, requirement)", () => {
    let state: SelectionState = selectionReducer(initialSelectionState, { type: "toggle", id: "t1" });
    state = selectionReducer(state, { type: "toggle", id: "t2" });
    state = selectionReducer(state, { type: "toggle", id: "t3" });
    const next = selectionReducer(state, { type: "clear" });
    expect(next.active).toBe(false);
    expect(next.selected.size).toBe(0);
  });
});
