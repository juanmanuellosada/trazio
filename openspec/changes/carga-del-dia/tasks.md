## 1. Cálculo

- [ ] 1.1 Crear `lib/planning/day-load.ts` con `computeDayLoad(items: { durationMinutes: number | null }[])` devolviendo `{ totalMinutes, withoutDuration }`. Sin imports de dominio: recibe duraciones ya resueltas (D-A).
- [ ] 1.2 Tests del cálculo puro: lista vacía, todo con duración, todo sin duración, mezcla, y duración cero (que no es lo mismo que ausente).
- [ ] 1.3 Reusar el formateo de duración de `lib/habits/format.ts` en vez de escribir uno nuevo (D-F). Si esa función no está exportada de forma reusable, extraerla a un módulo compartido sin cambiar su comportamiento.

## 2. Composición

- [ ] 2.1 Crear `components/calendar/use-day-load.ts`, hermano de `use-hoy-events.ts`, que junta tareas, hábitos y eventos y llama a `computeDayLoad`. Es el único lugar que ve las tres fuentes: `components/tasks/` NO puede importar de `lib/calendar/` (hay un test que lo verifica).
- [ ] 2.2 Aplicar los criterios de D-B: excluir completadas, hábitos completados y salteados, y eventos de todo el día. Para "hábito pendiente" usar `isHabitPendingToday` de `lib/habits/pending-today.ts`, no una definición nueva.
- [ ] 2.3 Sumar las atrasadas en Hoy y devolverlas contadas aparte, para que el texto pueda decir que están incluidas.
- [ ] 2.4 Tratar `loading`, `not_connected` y `unavailable` de `useHoyEvents` igual que "sin eventos": el total se calcula lo mismo y no se avisa nada (D-D).

## 3. Interfaz

- [ ] 3.1 Mostrar el total en el encabezado de `components/tasks/hoy-view.tsx`, recibiendo el resultado ya calculado por props para no romper la restricción de imports.
- [ ] 3.2 Componer el texto según D-C: total solo, total + "N sin duración", o solo el conteo cuando nada tiene duración. Nunca "0m planificadas".
- [ ] 3.3 Indicar en el texto cuando el total incluye tareas atrasadas.
- [ ] 3.4 Sumar el tiempo al encabezado de día de la lista de Próximos, al lado del contador de tareas que ya existe, sin las atrasadas (D-B).
- [ ] 3.5 Confirmar que en el panel y el calendario de Próximos no aparece.
- [ ] 3.6 Revisar el resultado contra la skill `ui-ux-pro-max` antes de fijar el tratamiento visual: es texto secundario en un encabezado, no un indicador con peso propio, y no lleva color de alerta.

## 4. Tests de interfaz

- [ ] 4.1 Tests de `hoy-view` con las combinaciones de D-C, incluida la de "nada tiene duración".
- [ ] 4.2 Test de que el total incluye atrasadas en Hoy y no las incluye en Próximos.
- [ ] 4.3 Test de que el total se muestra con el calendario desconectado.
- [ ] 4.4 Confirmar que `lib/calendar/tasks-and-habits-never-publish-to-google.test.ts` sigue en verde: es el que detecta si el cálculo se coló en `components/tasks/`.

## 5. Documentación y cierre

- [ ] 5.1 Sumar el total del día a `docs/product-spec.md`, en las secciones de Hoy y de Próximos.
- [ ] 5.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 5.3 Verificar en el navegador con datos reales: un día cargado, un día vacío, un día donde nada tiene duración, y con el calendario desconectado.
