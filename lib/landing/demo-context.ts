import type { ParserProject } from "@/lib/parser/types";

/**
 * Contexto compartido de las demostraciones del parser en la landing (hero,
 * demo interactiva, galería de transformaciones): mismos proyectos que
 * `scripts/seed-landing-demo.mjs`, para que `@Trabajo` resuelva de verdad
 * como lo vería alguien con cuenta.
 */
export const LANDING_DEMO_PROJECTS: ParserProject[] = [
  { id: "casa", name: "Casa", path: "Casa", sections: [] },
  { id: "trabajo", name: "Trabajo", path: "Trabajo", sections: [] },
  { id: "estudio", name: "Estudio", path: "Estudio", sections: [] },
];

export const LANDING_ZONE = "America/Argentina/Buenos_Aires";
export const LANDING_WEEK_START = 1 as const; // lunes, default de `user_preferences.week_starts_on`

/**
 * Instante de referencia fijo para todo lo que se parsea en el servidor
 * (hero congelado, galería de transformaciones): a diferencia de la demo
 * interactiva —que usa `new Date()` en el cliente, al hidratar—, el hero y
 * la galería son Server Components sin JavaScript, evaluados en build time.
 * Un `new Date()` ahí haría que el HTML estático dependiera de cuándo se
 * corrió `pnpm build`, lo que rompe el determinismo del build sin aportar
 * nada: son ejemplos ilustrativos, no un reloj en vivo. Lunes fijo, a la
 * tarde.
 */
export const LANDING_REFERENCE_DATE = new Date("2026-01-12T15:00:00-03:00");
