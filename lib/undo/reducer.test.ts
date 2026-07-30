import { describe, expect, it } from "vitest";
import { UNDO_STACK_LIMIT, undoStackReducer, type UndoStackState } from "./reducer";
import type { UndoEntry } from "./types";

function entry(id: string): UndoEntry {
  return { id, label: `acción ${id}`, undo: () => {} };
}

describe("undoStackReducer — pila acotada a 20 (requirement \"Pila de acciones acotada a 20, en memoria, por sesión\")", () => {
  it("la acción número 21 descarta la más antigua", () => {
    let state: UndoStackState = [];
    for (let i = 1; i <= 21; i++) {
      state = undoStackReducer(state, { type: "push", entry: entry(String(i)) });
    }
    expect(state).toHaveLength(UNDO_STACK_LIMIT);
    expect(state.find((e) => e.id === "1")).toBeUndefined();
    expect(state.find((e) => e.id === "2")).toBeDefined();
    expect(state[state.length - 1].id).toBe("21");
  });

  it("remove saca una entrada puntual sin tocar el resto", () => {
    const state: UndoStackState = [entry("a"), entry("b"), entry("c")];
    const next = undoStackReducer(state, { type: "remove", id: "b" });
    expect(next.map((e) => e.id)).toEqual(["a", "c"]);
  });
});
