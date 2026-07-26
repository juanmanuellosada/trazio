import { describe, expect, it } from "vitest";
import { isNetworkError } from "./network-error";

describe("isNetworkError", () => {
  it("reconoce el TypeError que lanza fetch cuando no hay conexión", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new TypeError("NetworkError when attempting to fetch resource"))).toBe(true);
  });

  it("no confunde un rechazo con respuesta (RLS, validación) con un fallo de red", () => {
    expect(isNetworkError(new Error("new row violates row-level security policy"))).toBe(false);
    expect(isNetworkError({ message: "boom" })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
