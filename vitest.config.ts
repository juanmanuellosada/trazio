import { cpus } from "node:os";
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
    // con `pnpm test:rls` (ver vitest.rls.config.ts). `e2e/**` corre con
    // Playwright (`pnpm test:e2e`), no con Vitest: sus archivos usan
    // `@playwright/test`, no el `describe`/`it` de acá.
    exclude: [...configDefaults.exclude, "supabase/tests/**", "e2e/**"],
    // Por default Vitest lanza un proceso por núcleo menos uno (11 en una
    // máquina de 12): reproducido, eso ya alcanza para saturar la CPU real
    // (`uptime` marcaba load average > 15 con una sola corrida de
    // `pnpm test`), y bajo esa saturación un test cualquiera —no siempre el
    // mismo, se reprodujo en archivos sin relación entre sí, de tareas y de
    // calendario— puede tardar más que su timeout (el de un `waitFor`
    // puntual o el `testTimeout` general de 5000ms) sin que el componente
    // ni el mock tengan nada de lento: es el scheduler del sistema, no el
    // código. Subir esos timeouts no ataca la causa, solo la hace menos
    // frecuente (y más difícil de notar si empeora). Bajar la cantidad de
    // procesos en paralelo sí: le devuelve a cada uno CPU real de sobra
    // para completar dentro del timeout que ya tiene. Mismo principio que
    // `fileParallelism: false` en `vitest.rls.config.ts`, más liviano
    // (partir el paralelismo a la mitad en vez de serializar del todo,
    // que acá no hace falta porque la contención es de CPU, no de un
    // servicio externo compartido).
    //
    // Esta contención es de esta máquina de desarrollo local (varios agentes
    // corriendo en paralelo, cada uno con su propio dev server y navegador),
    // no de los tests en sí. En CI la máquina es dedicada —nadie más compite
    // por CPU— así que el problema que motiva este límite no existe ahí:
    // limitarlo también en CI solo le haría pagar en cada corrida (con
    // runners de 2-4 núcleos, `floor(núcleos / 2)` da 1-2 procesos, muy poco
    // para 175 archivos) un problema que en CI no ocurre. Por eso el límite
    // es condicional a `!process.env.CI`; no lo simplifiques quitando la
    // condición.
    maxWorkers: process.env.CI
      ? undefined
      : Math.max(1, Math.floor(cpus().length / 2)),
  },
});
