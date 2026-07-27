import { expect, test } from "@playwright/test";

/**
 * 14.9: solo lo verificable sin heurísticas de navegador. El prompt real de
 * instalación (`beforeinstallprompt`) depende de heurísticas de Chrome que
 * Playwright no dispara — no se simula ni se da por probado acá, queda
 * documentado como prueba manual pendiente en el reporte de esta tarea.
 */
test.describe("14.9 — instalación de la PWA", () => {
  test("el manifest es JSON válido, standalone, y sus íconos resuelven con 200", async ({ page, request }) => {
    await page.goto("/");

    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.ok(), `GET /manifest.webmanifest devolvió ${manifestRes.status()}`).toBeTruthy();

    const manifest = await manifestRes.json();
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);

    for (const icon of manifest.icons as { src: string }[]) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.ok(), `ícono ${icon.src} no resuelve con 200 (status ${iconRes.status()})`).toBeTruthy();
    }
  });

  test("el service worker se registra y termina controlando la página", async ({ page }) => {
    await page.goto("/");

    await page.waitForFunction(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration?.active;
    });

    // El registration recién controla la página después de un reload
    // (comportamiento estándar del navegador, no un bug de la app). El
    // pequeño margen antes de recargar es real: Chromium tarda un instante
    // en propagar "activated" al estado interno que decide qué worker
    // controla la próxima navegación — sin esto, un reload inmediato
    // todavía puede llegar sin controller.
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10_000 });

    const controllerScriptUrl = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
    expect(controllerScriptUrl).toContain("/sw.js");
  });
});
