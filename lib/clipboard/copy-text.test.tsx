// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextLazily } from "./copy-text";

/**
 * jsdom no trae `ClipboardItem`: se instala un stub mínimo que guarda el
 * `data` tal cual se lo pasaron (una `Promise<Blob>` por MIME type), para
 * poder inspeccionarlo después sin depender de que `Blob` tenga `.text()`
 * en el entorno de test.
 */
class MockClipboardItem {
  constructor(readonly data: Record<string, string | Blob | PromiseLike<string | Blob>>) {}
}

function stubClipboardItem() {
  vi.stubGlobal("ClipboardItem", MockClipboardItem);
}

/**
 * `write` "realista": espera las promesas de cada MIME type, igual que el
 * portapapeles real — así un blob que rechaza (porque `buildText` falló)
 * hace que `write()` también rechace, sin necesidad de simularlo aparte.
 */
function realisticWrite() {
  return vi.fn(async (items: MockClipboardItem[]) => {
    for (const item of items) {
      for (const value of Object.values(item.data)) {
        await value;
      }
    }
  });
}

function mockClipboard(overrides: { write?: ReturnType<typeof vi.fn>; writeText?: ReturnType<typeof vi.fn> } = {}) {
  const write = overrides.write ?? realisticWrite();
  const writeText = overrides.writeText ?? vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { write, writeText },
    configurable: true,
    writable: true,
  });
  return { write, writeText };
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "clipboard");
});

async function blobText(value: string | Blob | PromiseLike<string | Blob>): Promise<string> {
  const resolved = await value;
  if (typeof resolved === "string") return resolved;
  return resolved.text();
}

describe("copyTextLazily", () => {
  it("no espera ningún await antes de llamar a clipboard.write — se prueba con un buildText que nunca resuelve", () => {
    const { write } = mockClipboard();
    stubClipboardItem();
    const buildText = vi.fn(() => new Promise<string>(() => {}));

    void copyTextLazily(buildText);

    expect(write).toHaveBeenCalledTimes(1);
  });

  it("con ClipboardItem disponible, usa write (no writeText) con un ClipboardItem 'text/plain' cuyo blob resuelve al texto", async () => {
    const { write, writeText } = mockClipboard();
    stubClipboardItem();

    const result = await copyTextLazily(async () => "hola mundo");

    expect(result).toBe("ok");
    expect(write).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    const [items] = write.mock.calls[0] as [MockClipboardItem[]];
    const clipboardItem = items[0];
    expect(Object.keys(clipboardItem.data)).toEqual(["text/plain"]);
    expect(await blobText(clipboardItem.data["text/plain"])).toBe("hola mundo");
  });

  it("sin ClipboardItem, cae a writeText con el texto resuelto", async () => {
    const { write, writeText } = mockClipboard();
    // ClipboardItem no se stubea: queda undefined, como en jsdom por default.

    const result = await copyTextLazily(async () => "hola mundo");

    expect(result).toBe("ok");
    expect(writeText).toHaveBeenCalledWith("hola mundo");
    expect(write).not.toHaveBeenCalled();
  });

  it("si buildText rechaza con ClipboardItem disponible, devuelve source-failed", async () => {
    mockClipboard();
    stubClipboardItem();

    const result = await copyTextLazily(async () => {
      throw new Error("network");
    });

    expect(result).toBe("source-failed");
  });

  it("si buildText rechaza sin ClipboardItem, devuelve source-failed", async () => {
    const { writeText } = mockClipboard();

    const result = await copyTextLazily(async () => {
      throw new Error("network");
    });

    expect(result).toBe("source-failed");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("si el portapapeles rechaza (write) pero buildText resuelve bien, devuelve clipboard-denied", async () => {
    mockClipboard({ write: vi.fn().mockRejectedValue(new Error("denied")) });
    stubClipboardItem();

    const result = await copyTextLazily(async () => "hola mundo");

    expect(result).toBe("clipboard-denied");
  });

  it("si el portapapeles rechaza (writeText) pero buildText resuelve bien, devuelve clipboard-denied", async () => {
    mockClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    // sin ClipboardItem: cae al camino de writeText

    const result = await copyTextLazily(async () => "hola mundo");

    expect(result).toBe("clipboard-denied");
  });

  it("si buildText y el portapapeles rechazan los dos, gana source-failed (el mensaje más informativo)", async () => {
    mockClipboard({ write: vi.fn().mockRejectedValue(new Error("denied")) });
    stubClipboardItem();

    const result = await copyTextLazily(async () => {
      throw new Error("network");
    });

    expect(result).toBe("source-failed");
  });

  it("no deja un unhandledrejection colgado cuando buildText falla en el camino de ClipboardItem", async () => {
    mockClipboard();
    stubClipboardItem();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    try {
      const result = await copyTextLazily(async () => {
        throw new Error("network");
      });
      expect(result).toBe("source-failed");
      // Deja correr una vuelta extra del event loop para que un rechazo
      // sin manejar, si lo hubiera, alcance a dispararse.
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});
