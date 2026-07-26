import { describe, expect, it } from "vitest";
import { computeOffline } from "./connectivity";

describe("computeOffline (D4)", () => {
  it("navigator.onLine en falso: sin conexión de inmediato, sin mirar las otras señales", () => {
    expect(
      computeOffline({ navigatorOnline: false, recentNetworkFailure: false, realtimeConnected: true }),
    ).toBe(true);
  });

  it("fallo de red confirmado por el canal de Realtime caído: sin conexión", () => {
    expect(
      computeOffline({ navigatorOnline: true, recentNetworkFailure: true, realtimeConnected: false }),
    ).toBe(true);
  });

  it("fallo de red aislado sin confirmación (Realtime sigue conectado): todavía no es sin conexión", () => {
    expect(
      computeOffline({ navigatorOnline: true, recentNetworkFailure: true, realtimeConnected: true }),
    ).toBe(false);
  });

  it("todo en orden: online", () => {
    expect(
      computeOffline({ navigatorOnline: true, recentNetworkFailure: false, realtimeConnected: true }),
    ).toBe(false);
  });
});
