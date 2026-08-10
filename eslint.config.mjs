import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generado por `supabase start`/`supabase branches` al levantar el stack
    // local, nunca se commitea (ver .gitignore). Incluye código minificado
    // del runtime de edge functions que dispara cientos de falsos positivos.
    "supabase/.branches/**",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
