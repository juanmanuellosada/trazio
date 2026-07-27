import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { addPlainTasks, createRootProject, createSubproject, openProject } from "./helpers/projects";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

test.describe("14.7 — eliminar un proyecto pide confirmación mostrando cuántas tareas se pierden", () => {
  test("el diálogo muestra exactamente la cantidad de tareas del subárbol de 3 niveles", async ({ page }) => {
    // Es el test más largo de la suite (3 proyectos anidados + 6 tareas por
    // UI real): con el resto de la suite corriendo en paralelo, el timeout
    // default de 30s puede quedar corto.
    test.setTimeout(60_000);
    const email = uniqueEmail("delete-count");
    await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
    await login(page, { email, password: PASSWORD });

    // Raíz -> hija -> nieta: los 3 niveles de anidamiento que permite la base (bloque 3.4/6.3).
    const nameA = uniqueName("Raíz");
    const nameB = uniqueName("Hija");
    const nameC = uniqueName("Nieta");

    await createRootProject(page, nameA);
    await createSubproject(page, nameA, nameB);
    await createSubproject(page, nameB, nameC);

    await openProject(page, nameA);
    const tasksA = [uniqueName("Tarea A1"), uniqueName("Tarea A2")];
    await addPlainTasks(page, tasksA);

    await openProject(page, nameB);
    const tasksB = [uniqueName("Tarea B1")];
    await addPlainTasks(page, tasksB);

    await openProject(page, nameC);
    const tasksC = [uniqueName("Tarea C1"), uniqueName("Tarea C2"), uniqueName("Tarea C3")];
    await addPlainTasks(page, tasksC);

    // El conteo esperado sale de lo que el propio test creó (2 + 1 + 3), no
    // de un número puesto a mano.
    const expectedCount = tasksA.length + tasksB.length + tasksC.length;

    await openProject(page, nameA);
    await page.getByRole("button", { name: "Más acciones del proyecto" }).click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText(`Se van a eliminar ${expectedCount} tareas`, { exact: false })).toBeVisible();

    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
  });
});
