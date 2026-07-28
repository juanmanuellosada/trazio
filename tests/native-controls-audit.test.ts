import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Auditoría automática de la regla A1 de `openspec/changes/interfaz-propia/design.md`:
 * ningún control interactivo puede ser el que trae el navegador por
 * defecto. Recorre `app/`, `components/` y `lib/` buscando el patrón real
 * de *uso* —no la sola mención en un comentario que documenta el
 * reemplazo— de los cuatro campos nativos prohibidos y de los tres
 * diálogos nativos del navegador.
 *
 * Vive en Vitest, no en una regla de ESLint nueva: el repo no tiene
 * infraestructura de reglas propias (solo `eslint-config-next`), así que
 * escribir y mantener un plugin de ESLint para cuatro patrones sería más
 * pesado que un test que recorre el árbol de archivos con `fs` — el mismo
 * patrón que ya usan otros tests del repo (ver `lib/safe-path.test.ts`
 * para las utilidades, aunque este test es sobre el árbol de archivos y
 * no sobre un módulo). Corre como parte de `pnpm test`.
 */

const ROOT_DIRS = ["app", "components", "lib"];
const SCAN_EXTENSIONS = [".ts", ".tsx"];

// Este archivo documenta los patrones prohibidos en sus propios
// comentarios y no debe auditarse a sí mismo.
const SELF_PATH = join("tests", "native-controls-audit.test.ts");

const NATIVE_INPUT = /<input\b[^>]*\btype=["'](date|time|datetime-local|color)["']/;
const NATIVE_DIALOG = /window\.(confirm|alert|prompt)\s*\(/;

// Los comentarios que documentan el reemplazo (por ejemplo, "ya no usamos
// <input type=\"date\">") no cuentan como uso real: se ignoran las líneas
// cuyo contenido, sin espacios, empieza con `//`, `*` (continuación de un
// bloque `/** */`) o `/*`.
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (SCAN_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

type Violation = { file: string; line: number; text: string };

function auditFile(path: string): Violation[] {
  const violations: Violation[] = [];
  readFileSync(path, "utf-8")
    .split("\n")
    .forEach((line, index) => {
      if (isCommentLine(line)) return;
      if (NATIVE_INPUT.test(line) || NATIVE_DIALOG.test(line)) {
        violations.push({ file: path, line: index + 1, text: line.trim() });
      }
    });
  return violations;
}

describe("auditoría de controles nativos (design.md A1)", () => {
  it(
    `no reintroduce <input type="date|time|datetime-local|color">` +
      ` ni window.confirm/alert/prompt en ${ROOT_DIRS.join(", ")}`,
    () => {
      const violations = ROOT_DIRS.flatMap((dir) => collectFiles(dir))
        .filter((path) => path !== SELF_PATH)
        .flatMap(auditFile);

      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    },
  );
});
