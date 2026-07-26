import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Config aparte para los tests de RLS de supabase/tests/: necesitan
// Supabase local corriendo en Docker (`pnpm supabase start` o
// `db reset`), así que no forman parte del `pnpm test` por defecto. Se
// corren con `pnpm test:rls`.
export default defineConfig({
  // Mismo alias `@/*` que `vitest.config.ts`: hace falta desde que
  // `tasks.test.ts` (bloque 7) importa `duplicateTaskTree` de `lib/tasks/`
  // en vez de reimplementar la lógica de duplicar acá.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
