import { expect, test } from "@playwright/test";
import { login, logout, registerAndConfirm } from "./helpers/auth";
import { waitForEmailLink } from "./helpers/mailpit";
import { PASSWORD, PASSWORD_NUEVA, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * Criterio 14.1, literal: "Una persona se registra, confirma el correo,
 * olvida la contraseña, la recupera y vuelve a entrar. Sin intervención
 * manual." Cada paso es una acción real de Playwright; los dos links salen
 * de Mailpit por su API HTTP (`waitForEmailLink`), nunca leídos por una
 * persona.
 */
test.describe("14.1 — cuenta completa sin intervención manual", () => {
  test("registro, confirmación, logout, reset de contraseña y login con la nueva", async ({ page }) => {
    const email = uniqueEmail("auth");
    const name = uniqueName("Persona");

    await registerAndConfirm(page, { name, email, password: PASSWORD });

    await logout(page);

    await page.goto("/login");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL(/\/recuperar-contrasena$/);

    await page.getByLabel("Correo").fill(email);
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText("Revisá tu correo")).toBeVisible();

    const resetLink = await waitForEmailLink({ to: email, subject: "Restablecé tu contraseña de Trazio" });
    await page.goto(resetLink);
    await expect(page).toHaveURL(/\/restablecer-contrasena$/);

    await page.getByLabel("Contraseña nueva").fill(PASSWORD_NUEVA);
    await page.getByLabel("Confirmar contraseña").fill(PASSWORD_NUEVA);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page).toHaveURL(/\/bandeja$/);

    // El reset ya deja sesión iniciada (`restablecer-contrasena/actions.ts`):
    // cerrar sesión de nuevo y entrar por el login normal es lo que prueba
    // "volver a entrar con la contraseña nueva", no la sesión residual del reset.
    await logout(page);
    await login(page, { email, password: PASSWORD_NUEVA });
    await expect(page).toHaveURL(/\/(bandeja|hoy)$/);
  });
});
