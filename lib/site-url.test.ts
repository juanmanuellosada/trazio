import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequestHost, getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa NEXT_PUBLIC_SITE_URL cuando está definida", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar/");
    vi.stubEnv("VERCEL_URL", "trazio-git-preview.vercel.app");

    expect(getSiteUrl()).toBe("https://trazio.com.ar");
  });

  it("deriva de VERCEL_URL cuando NEXT_PUBLIC_SITE_URL no está definida", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "trazio-git-preview.vercel.app");

    expect(getSiteUrl()).toBe("https://trazio-git-preview.vercel.app");
  });

  it("cae a localhost cuando no hay ninguna de las dos", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("con requestHost, arma la URL con el host real del pedido en vez del apex fijo", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar");

    expect(getSiteUrl("www.trazio.com.ar")).toBe("https://www.trazio.com.ar");
  });

  it("sin requestHost, se queda con el host fijo de NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trazio.com.ar");

    expect(getSiteUrl(null)).toBe("https://trazio.com.ar");
  });

  it("requestHost no aplica si NEXT_PUBLIC_SITE_URL no está definida (Preview)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "trazio-git-preview.vercel.app");

    expect(getSiteUrl("otro-host-cualquiera.com")).toBe("https://trazio-git-preview.vercel.app");
  });
});

describe("getRequestHost", () => {
  it("prefiere x-forwarded-host sobre host", () => {
    const headers = new Headers({ "x-forwarded-host": "www.trazio.com.ar", host: "trazio.com.ar" });

    expect(getRequestHost(headers)).toBe("www.trazio.com.ar");
  });

  it("cae a host cuando no hay x-forwarded-host", () => {
    const headers = new Headers({ host: "www.trazio.com.ar" });

    expect(getRequestHost(headers)).toBe("www.trazio.com.ar");
  });

  it("devuelve null cuando no hay ninguno de los dos", () => {
    const headers = new Headers();

    expect(getRequestHost(headers)).toBeNull();
  });
});
