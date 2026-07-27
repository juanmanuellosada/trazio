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
    // Los archivos de este suite corren contra el mismo Supabase local
    // (Docker) y cada uno crea y borra sus propios usuarios de auth.users.
    // Por default Vitest los corre en paralelo, en procesos worker
    // distintos: eso significa varios archivos creando usuarios y
    // firmando sesiones al mismo tiempo contra el mismo Kong/PostgREST/
    // GoTrue local. Reproducido: bajo esa concurrencia, Kong devuelve
    // intermitentemente "An invalid response was received from the
    // upstream server" (502) y el insert que sigue revienta con un
    // TypeError encubierto porque el test no
    // esperaba error. No es un bug de la suite ni de las políticas de
    // RLS: es contención del stack local bajo carga concurrente.
    //
    // `fileParallelism: false` serializa los archivos de ESTE suite
    // (no toca `pnpm test`, que sigue corriendo en paralelo: esos tests
    // no tocan Supabase local). Sale más lento a cambio de dejar de ser
    // intermitente. No revertir esto por velocidad sin volver a probarlo
    // con varias corridas concurrentes de `pnpm test:rls` primero — así
    // es como se reprodujo el fallo.
    fileParallelism: false,
  },
});
