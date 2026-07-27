import { expect, type Page } from "@playwright/test";
import { waitForEmailLink } from "./mailpit";

/**
 * Registro real por UI + confirmación real leyendo el link de Mailpit por
 * API HTTP (criterio 14.1): cero intervención manual. Deja al usuario
 * logueado en `/bandeja` (destino por defecto, B4) al terminar.
 */
export async function registerAndConfirm(
  page: Page,
  options: { name: string; email: string; password: string },
): Promise<void> {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(options.name);
  await page.getByLabel("Correo").fill(options.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(options.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByText("Revisá tu correo")).toBeVisible();

  const link = await waitForEmailLink({ to: options.email, subject: "Confirmá tu cuenta de Trazio" });
  await page.goto(link);
  await expect(page).toHaveURL(/\/bandeja$/);
}

export async function login(page: Page, options: { email: string; password: string }): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(options.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(options.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/(bandeja|hoy)$/);
}

export async function logout(page: Page): Promise<void> {
  await page.getByLabel("Cerrar sesión").click();
  await expect(page).toHaveURL(/\/$/);
}
