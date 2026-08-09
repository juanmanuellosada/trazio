## Why

Una cuenta nueva de Trazio abre en una Bandeja de entrada vacía. Todo lo que
hace distinta a la app —que se pueda escribir "Comprar café mañana 9am p1" y
salgan fecha, hora y prioridad; que las subtareas se aniden sin límite; que
los hábitos convivan con las tareas; que el calendario muestre los tres
juntos— es invisible hasta que alguien lo descubre solo. El parser tiene una
demo en la landing y después desaparece justo cuando empieza a servir.

Todas las apps líderes resuelven esto igual: contenido de ejemplo real en la
primera entrada, que se usa y se borra. No un recorrido guiado con globitos.

Los filtros guardados son el caso más extremo de esta invisibilidad: existen
desde fase 2, están terminados y en producción, y ni siquiera el dueño del
proyecto —quien los especificó— se acordaba de que Trazio ya tiene la función
de Todoist que estaba preguntando por otro lado. Si la persona que escribió el
spec la olvida, nadie que se registre hoy la va a encontrar sola.

## What Changes

- La primera vez que se entra a la aplicación, la cuenta SHALL recibir
  contenido de ejemplo: un proyecto con tareas que enseñan por ser tareas de
  verdad —una con fecha y prioridad puestas por el parser, una con
  subtareas, una con etiqueta—, **un hábito**, que si no queda invisible, y
  **un filtro guardado**, favorito desde que se crea, con una consulta que
  alguien de verdad querría conservar (no una demostración de sintaxis).
- El contenido de ejemplo SHALL crearse **exactamente una vez** por cuenta.
  Vaciar la cuenta después NUNCA SHALL volver a crearlo.
- El proyecto de ejemplo SHALL poder borrarse entero con una sola acción,
  desde el proyecto mismo, y esa acción SHALL llevarse también el hábito y el
  filtro de ejemplo. Nadie tiene que limpiar a mano lo que no pidió.
- Las cuentas que ya existen NUNCA SHALL recibir contenido de ejemplo.
- **No hay recorrido guiado**, ni globitos, ni pasos obligatorios, ni una
  lista de logros. El contenido de ejemplo es contenido, no un tutorial.

## Capabilities

### New Capabilities

- `onboarding-con-ejemplos`: qué contenido recibe una cuenta nueva, cuándo se
  crea, la garantía de que se crea una sola vez, y cómo se borra.

### Modified Capabilities

- `esquema-datos`: `user_preferences` suma la marca de que la cuenta ya
  recibió su contenido de ejemplo, con backfill para las cuentas existentes.
  `projects`, `habits` y `filters` suman una marca de "es de ejemplo", para
  que la acción de borrado los encuentre sin depender de su nombre.

## Impact

**Base de datos** — una columna en `user_preferences` y su backfill, más una
columna `is_example` en `projects`, `habits` y `filters` (con su índice único
parcial por usuario). El trigger de aprovisionamiento (`handle_new_user`)
**no** cambia: sigue creando perfil, preferencias y Bandeja, y nada más.

**Servidor** — el sembrado corre del lado del servidor en la primera entrada,
no en el trigger, para que el texto de las tareas viva en TypeScript y no
adentro de una función de Postgres.

**Interfaz** — una acción de borrado en el proyecto de ejemplo.

**Copy** — las tareas de ejemplo son texto de producto y siguen
`.claude/rules/copy.md`. Son lo único que una persona ve de Trazio antes de
escribir nada suyo.

**Fuera de alcance** — recorrido guiado, checklist de primeros pasos,
plantillas de proyecto elegibles al registrarse, y sembrar eventos en el
Google Calendar de nadie.
