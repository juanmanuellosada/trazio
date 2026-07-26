import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

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
});
