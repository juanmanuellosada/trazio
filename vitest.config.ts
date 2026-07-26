import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Los tests de RLS de supabase/tests/ necesitan Supabase local
    // corriendo en Docker: quedan fuera de `pnpm test` y corren aparte
    // con `pnpm test:rls` (ver vitest.rls.config.ts).
    exclude: [...configDefaults.exclude, "supabase/tests/**"],
  },
});
