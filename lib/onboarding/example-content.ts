/**
 * Contenido de ejemplo sembrado en la primera entrada de una cuenta nueva
 * (`openspec/changes/onboarding-con-ejemplos`, D-E): un proyecto con cuatro
 * tareas, un hábito y un filtro guardado, cada uno mostrando una capacidad
 * de la app por su propia forma, sin texto que le explique a la persona qué
 * tocar. Vive en TypeScript, no en el trigger de aprovisionamiento (D-A),
 * para que se lea, se testee y se cambie sin escribir una migración. Lo
 * consume `seed-example-content.ts`.
 *
 * El filtro se sumó después de la primera versión de este cambio: el propio
 * dueño del proyecto —quien especifica los filtros— preguntó por una
 * función de Todoist que Trazio ya tiene desde fase 2, completa y en
 * producción. Es la prueba en carne propia del problema que resuelve este
 * cambio entero: si ni quien la especificó se acuerda de que existe, nadie
 * que se registre hoy la va a encontrar. Por eso el filtro de ejemplo no es
 * una demostración de sintaxis (D-E, igual que el resto): es una consulta
 * que alguien de verdad querría conservar.
 */

import type { ProjectColor } from "@/lib/validation/colors";
import type { HabitFrequencyType } from "@/lib/habits/habit-columns";

export const EXAMPLE_PROJECT: { name: string; color: ProjectColor; icon: string } = {
  name: "Ejemplos",
  color: "celeste",
  icon: "💡",
};

/**
 * Frase que produce fecha, hora y prioridad ya aplicadas (D-E, primera fila
 * de la tabla): se guarda tal cual como título de la tarea, sin recortar lo
 * que el parser reconoce en ella, para que la tarea muestre la frase que la
 * produjo — no una versión ya limpia. `example-content.test.ts` corre esta
 * misma constante contra el parser real para que nunca prometa atributos
 * que el parser dejó de reconocer.
 */
export const EXAMPLE_TASK_WITH_PARSER_PHRASE = "Comprar café mañana 9am p1";

export const EXAMPLE_TASK_WITH_SUBTASKS: { title: string; subtasks: string[] } = {
  title: "Preparar la mudanza",
  subtasks: ["Embalar la cocina", "Avisar al portero", "Contratar el flete"],
};

export const EXAMPLE_TASK_WITH_LABEL: { title: string; labelName: string; labelColor: ProjectColor } = {
  title: "Renovar la licencia de conducir",
  labelName: "Trámites",
  labelColor: "turquesa",
};

export const EXAMPLE_TASK_PLAIN = "Revisar el resumen de la tarjeta";

export const EXAMPLE_HABIT: {
  name: string;
  icon: string;
  color: ProjectColor;
  durationMinutes: number;
  frequencyType: HabitFrequencyType;
} = {
  name: "Meditar",
  icon: "🧘",
  color: "violeta",
  durationMinutes: 10,
  // Sin hora programada (D-E): un hábito "todo el día" no ocupa un horario
  // del calendario que la persona no eligió. `scheduled_time` se omite al
  // insertar, no se fuerza acá — la columna ya es nula por default.
  frequencyType: "daily",
};

/**
 * Filtro de ejemplo: vencidas o de hoy, en las dos prioridades más altas —
 * la consulta que más gente termina guardando a mano tarde o temprano, no
 * una vidriera de sintaxis. `parseQuery` la valida en
 * `example-content.test.ts` por el mismo motivo que
 * `EXAMPLE_TASK_WITH_PARSER_PHRASE`: si el lenguaje de consulta cambia, que
 * rompa acá antes que sembrar un filtro que ya no corre.
 *
 * Favorito desde que se crea (D-D de la ampliación): aparece en el panel
 * lateral sin que la persona tenga que ir a buscarlo a la pantalla de
 * Filtros.
 */
export const EXAMPLE_FILTER: { name: string; query: string; color: ProjectColor; icon: string; isFavorite: true } = {
  name: "Urgente",
  query: "(due:overdue | due:today) & priority:1,2",
  color: "magenta",
  icon: "🔥",
  isFavorite: true,
};
