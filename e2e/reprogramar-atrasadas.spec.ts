import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./helpers/env";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * `openspec/changes/reprogramar-las-atrasadas`: la acción del encabezado de
 * Atrasadas cubre un flujo de punta a punta que la suite de componentes no
 * puede probar (`hoy-view.test.tsx` mockea la mutación en lote, así que
 * nunca ejercita el patch real ni el desmontaje/montaje real de dos
 * popovers modales seguidos). Este spec sí: siembra dos atrasadas de
 * prioridad distinta con `service_role` contra el Supabase **local**
 * (nunca producción — ver `playwright.config.ts`), reprograma con un
 * filtro rápido activo (D-A: solo toca lo que el filtro deja ver), y
 * comprueba que se deshace como una sola acción (D-B) sin haber pedido
 * confirmación en ningún paso.
 */

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

test("reprogramar las atrasadas desde el encabezado, en el navegador real", async ({ page }) => {
  test.setTimeout(120_000);

  const email = uniqueEmail("reprogramar-atrasadas");
  const user = await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Test") });
  if (!user) throw new Error("no se pudo crear el usuario de prueba");

  const admin = adminClient();
  const { data: inbox, error: inboxError } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_inbox", true)
    .single();
  if (inboxError || !inbox) throw new Error(`no se encontró la bandeja de entrada: ${inboxError?.message}`);

  const { error: tasksError } = await admin.from("tasks").insert([
    { title: "Tarea urgente atrasada", project_id: inbox.id, user_id: user.id, position: 0, priority: 1, due_date: "2026-08-01" },
    { title: "Tarea de baja prioridad atrasada", project_id: inbox.id, user_id: user.id, position: 1, priority: 4, due_date: "2026-08-02" },
  ]);
  if (tasksError) throw new Error(`no se pudieron sembrar las tareas: ${tasksError.message}`);

  await login(page, { email, password: PASSWORD });
  await page.goto("/hoy");
  await expect(page.getByText("Atrasadas", { exact: true })).toBeVisible();
  await expect(page.getByText("Tarea urgente atrasada")).toBeVisible();
  await expect(page.getByText("Tarea de baja prioridad atrasada")).toBeVisible();

  // El botón dice el conteo (requirement "el alcance se dice antes de aplicar").
  const rescheduleButton = page.getByRole("button", { name: "Reprogramar 2 tareas atrasadas" });
  await expect(rescheduleButton).toBeVisible();
  await page.screenshot({ path: "test-results/reprogramar-atrasadas-header.png" });

  // Layout del popover: Hoy/Mañana arriba, calendario abajo, sin "Sin fecha".
  await rescheduleButton.click();
  await expect(page.getByRole("button", { name: "Hoy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mañana" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mes siguiente" })).toBeVisible();
  await expect(page.getByText("Sin fecha")).not.toBeVisible();
  await page.waitForTimeout(300); // dejar terminar la transición de apertura del popover antes de la captura
  await page.screenshot({ path: "test-results/reprogramar-atrasadas-popover.png" });
  await page.keyboard.press("Escape");
  // Esperar a que el popover modal termine de cerrar (Base UI lo desmonta
  // con una transición) antes de abrir el siguiente: si no, su fondo
  // inerte todavía puede interceptar los clics del próximo popover.
  await expect(page.getByRole("button", { name: "Mes siguiente" })).toBeHidden();

  // D-A: un filtro rápido activo acota el alcance a lo que se ve.
  await page.getByRole("button", { name: /^Formato/ }).click();
  await page.getByRole("combobox", { name: "Prioridad" }).click();
  await page.getByRole("option", { name: "Urgente", exact: true }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByText("Tarea de baja prioridad atrasada")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Reprogramar 1 tarea atrasada" })).toBeVisible();

  await page.getByRole("button", { name: "Reprogramar 1 tarea atrasada" }).click();
  await page.getByRole("button", { name: "Hoy" }).click();

  // Con el filtro puesto, ya no queda ninguna atrasada visible.
  await expect(page.getByText("Atrasadas", { exact: true })).not.toBeVisible();

  // Sacar el filtro: la de baja prioridad seguía atrasada (nunca se tocó) y
  // la urgente ahora vive en el bloque de hoy.
  await page.getByRole("button", { name: /^Formato/ }).click();
  await page.getByRole("combobox", { name: "Prioridad" }).click();
  await page.getByRole("option", { name: "Todas", exact: true }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByText("Atrasadas", { exact: true })).toBeVisible();
  await expect(page.getByText("Tarea de baja prioridad atrasada")).toBeVisible();
  await expect(page.getByText("Tarea urgente atrasada")).toBeVisible();

  // D-B: deshacible como una sola acción (Ctrl/Cmd+Z), sin haber pedido
  // confirmación en ningún momento de arriba.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText("Tarea urgente atrasada")).toBeVisible();
});
