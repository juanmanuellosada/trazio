/**
 * Copia al portapapeles un texto que todavía no existe: `buildText` sale a
 * buscarlo (red, datos) *después* de que el usuario ya hizo clic. El
 * problema es que WebKit —incluida la PWA en iOS— rechaza
 * `navigator.clipboard.writeText()` si hubo un solo `await` entre el
 * handler del clic y la llamada: se pierde la cadena del gesto de usuario.
 *
 * La solución, documentada por el propio WebKit para este caso: llamar a
 * `navigator.clipboard.write()` de forma **sincrónica**, con un
 * `ClipboardItem` cuyo valor es una `Promise<Blob>` que resuelve más
 * tarde, cuando `buildText()` termina. Por eso el orden de este archivo no
 * es negociable — no hay ningún `await` entre el inicio de la función y esa
 * llamada.
 *
 * `ClipboardItem` con blob diferido no está en todos los navegadores
 * (Firefox lo habilitó recién en la 127), así que hay respaldo liso a
 * `writeText`.
 */

/**
 * Distingue los dos fracasos posibles: no se pudo armar el texto (red,
 * datos) vs. el navegador negó el portapapeles. Cada uno merece un mensaje
 * distinto.
 */
export type CopyTextResult = "ok" | "source-failed" | "clipboard-denied";

export async function copyTextLazily(buildText: () => Promise<string>): Promise<CopyTextResult> {
  // Se guarda en una variable de cierre porque `write()`/`writeText()`
  // rechazan con el mismo tipo de error tanto si falló `buildText` como si
  // el navegador negó el permiso, y hay que poder distinguirlos después.
  let sourceError: unknown = null;
  const text = buildText().catch((error: unknown) => {
    sourceError = error; // se marca acá y se relanza
    throw error;
  });

  try {
    // `ClipboardItem` puede no existir en el navegador (tipado como
    // `declare var` en lib.dom, por eso el guard es `typeof`, no un chequeo
    // de instancia).
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
      blob.catch(() => {}); // evita el unhandledrejection del derivado
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    } else {
      await navigator.clipboard.writeText(await text);
    }
    return "ok";
  } catch {
    return sourceError !== null ? "source-failed" : "clipboard-denied";
  }
}
