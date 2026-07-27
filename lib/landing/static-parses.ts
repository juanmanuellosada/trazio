import { parse } from "@/lib/parser/parse";
import {
  LANDING_DEMO_PROJECTS,
  LANDING_REFERENCE_DATE,
  LANDING_WEEK_START,
  LANDING_ZONE,
} from "./demo-context";

function parseForLanding(text: string) {
  return parse(text, {
    ahora: LANDING_REFERENCE_DATE,
    zonaHoraria: LANDING_ZONE,
    semanaEmpiezaEn: LANDING_WEEK_START,
    proyectos: LANDING_DEMO_PROJECTS,
    etiquetas: [],
  });
}

/**
 * Ejemplos tocables de la demo interactiva (`parser-demo.tsx`). El primero
 * es el caso completo de `docs/parser-test-cases.md` #53 (adaptado a
 * `@Trabajo`, que sí existe en `LANDING_DEMO_PROJECTS` — `@Proyectos` del
 * caso original no resolvería contra este contexto) y es también el texto
 * que se muestra ya congelado en el hero: el mismo campo, primero estático
 * y después interactivo al hidratar.
 */
export const DEMO_EXAMPLES = [
  "Reunión con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Trabajo",
  "Llamar al contador mañana a las 10",
  "Pagar el alquiler cada mes p1",
  "Gimnasio cada lunes, miércoles y viernes por 1h",
] as const;

/** Parseo congelado del hero (bloque 12.1): calculado una vez, en build time. */
export const HERO_TEXT = DEMO_EXAMPLES[0];
export const HERO_PARSE_RESULT = parseForLanding(HERO_TEXT);

/**
 * Galería de transformaciones (bloque 12.4): seis oraciones de
 * `docs/parser-test-cases.md`, una por capacidad — fecha, hora, duración,
 * prioridad, etiqueta, repetición. El resultado se calcula con el parser de
 * verdad, no se inventa a mano: si el parser cambia, la galería se actualiza
 * sola.
 */
const GALLERY_TEXTS = [
  { text: "Cumpleaños de Ana 15 de marzo", capability: "date", caso: 12 },
  { text: "Reunión a las 3", capability: "hour", caso: 25 },
  { text: "Correr 1h30m", capability: "duration", caso: 28 },
  { text: "Llamar al contador p1", capability: "priority", caso: 38 },
  { text: "Comprar leche #compras", capability: "label", caso: 40 },
  { text: "Gimnasio cada lunes, miércoles y viernes por 1h", capability: "recurrence", caso: 57 },
] as const;

export const GALLERY_EXAMPLES = GALLERY_TEXTS.map(({ text, capability, caso }) => ({
  text,
  capability,
  caso,
  result: parseForLanding(text),
}));
