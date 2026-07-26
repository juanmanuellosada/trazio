import { defineConfig } from "vitest/config";

// Config aparte para los tests de RLS de supabase/tests/: necesitan
// Supabase local corriendo en Docker (`pnpm supabase start` o
// `db reset`), así que no forman parte del `pnpm test` por defecto. Se
// corren con `pnpm test:rls`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
