import { afterEach, describe, expect, it, vi } from "vitest";
import { getMcpResourceOrigin, getMcpResourceUrl } from "./config";

describe("getMcpResourceUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("con requestHost, anuncia el host real del pedido en vez del apex fijo", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar");

    expect(getMcpResourceUrl("www.trazio.com.ar")).toBe("https://www.trazio.com.ar/api/mcp");
  });

  it("sin requestHost, se queda con el host fijo de NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar");

    expect(getMcpResourceUrl()).toBe("https://trazio.com.ar/api/mcp");
  });
});

describe("getMcpResourceOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("con requestHost, anuncia el host real del pedido en vez del apex fijo", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar");

    expect(getMcpResourceOrigin("www.trazio.com.ar")).toBe("https://www.trazio.com.ar");
  });

  it("sin requestHost, se queda con el host fijo de NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar");

    expect(getMcpResourceOrigin()).toBe("https://trazio.com.ar");
  });
});
