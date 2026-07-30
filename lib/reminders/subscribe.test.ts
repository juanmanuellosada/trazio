// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToPush } from "./subscribe";

describe("subscribeToPush", () => {
  const originalKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "clave-de-prueba";
    vi.stubGlobal("PushManager", class {});
    vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("avisa en vez de quedarse colgado cuando nunca hubo una registración del service worker", async () => {
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        // Si el código llegara a esperar acá en vez de cortar antes, el test
        // nunca terminaría: así se reproduce el "se queda colgado" del bug.
        ready: new Promise(() => {}),
      },
    });

    await expect(subscribeToPush()).rejects.toThrow("service-worker-no-registrado");
  });
});
