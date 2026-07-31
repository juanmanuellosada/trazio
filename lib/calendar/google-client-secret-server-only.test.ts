import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Requisito del spec (conexion-google-calendar): "El secreto de cliente de
// Google permanece exclusivamente del lado servidor". Mismo criterio que
// lib/calendar/key-server-only.test.ts usa para la clave de cifrado, acá
// aplicado a GOOGLE_CLIENT_SECRET.
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const KEY_NAME = "GOOGLE_CLIENT_SECRET";
const PUBLIC_KEY_NAME = `NEXT_PUBLIC_${KEY_NAME}`;

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo", ".vercel"]);
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function isClientFile(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'");
}

describe("GOOGLE_CLIENT_SECRET nunca se expone al navegador", () => {
  const sourceFiles = listSourceFiles(REPO_ROOT);

  it("ningún archivo la referencia con el prefijo NEXT_PUBLIC_", () => {
    const offenders = sourceFiles.filter((file) => readFileSync(file, "utf8").includes(PUBLIC_KEY_NAME));
    expect(offenders).toEqual([]);
  });

  it("ningún archivo de componente cliente ('use client') la referencia", () => {
    const offenders = sourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8");
      return isClientFile(content) && content.includes(KEY_NAME);
    });
    expect(offenders).toEqual([]);
  });
});
