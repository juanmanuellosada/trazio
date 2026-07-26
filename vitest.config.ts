import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Espeja el alias `@/*` de tsconfig.json: Next.js lo resuelve solo, pero
  // Vitest corre fuera de su build y necesita su propio mapeo.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Los tests de componente (formularios de auth) corren en jsdom vía el
    // pragma `// @vitest-environment jsdom` en cada archivo; el resto de la
    // suite sigue en "node", más rápido.
    setupFiles: ["./vitest.setup.ts"],
    // Los tests de RLS de supabase/tests/ necesitan Supabase local
    // corriendo en Docker: quedan fuera de `pnpm test` y corren aparte
    // con `pnpm test:rls` (ver vitest.rls.config.ts).
    exclude: [...configDefaults.exclude, "supabase/tests/**"],
  },
});
