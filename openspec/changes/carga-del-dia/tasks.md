## 1. Cálculo

- [x] 1.1 Crear `lib/planning/day-load.ts` con `computeDayLoad(items: { durationMinutes: number | null }[])` devolviendo `{ totalMinutes, withoutDuration }`. Sin imports de dominio: recibe duraciones ya resueltas (D-A).
- [x] 1.2 Tests del cálculo puro: lista vacía, todo con duración, todo sin duración, mezcla, y duración cero (que no es lo mismo que ausente).
- [ ] 1.3 Reusar el formateo de duración de `lib/habits/format.ts` en vez de escribir uno nuevo (D-F). Si esa función no está exportada de forma reusable, extraerla a un módulo compartido sin cambiar su comportamiento. **Sin hacer literalmente**: `formatHabitDuration` (`lib/habits/format.ts`) formatea "20 min" fijo, sin lógica de horas — no implementa el criterio "5h 20m"/"45m"/"2h" que D-F describe, y cambiarle el comportamiento habría alterado la tarjeta de hábito (fuera de alcance). El formateador "Xh Ym" quedó en `lib/planning/day-load.ts` (`formatDayLoad`), un único lugar nuevo en vez de reusar uno inexistente. Ver el reporte de cierre para el detalle.

## 2. Composición

- [x] 2.1 Crear `components/calendar/use-day-load.ts`, hermano de `use-hoy-events.ts`, que junta tareas, hábitos y eventos y llama a `computeDayLoad`. Es el único lugar que ve las tres fuentes: `components/tasks/` NO puede importar de `lib/calendar/` (hay un test que lo verifica).
- [x] 2.2 Aplicar los criterios de D-B: excluir completadas, hábitos completados y salteados, y eventos de todo el día. Para "hábito pendiente" usar `isHabitPendingToday` de `lib/habits/pending-today.ts`, no una definición nueva.
- [x] 2.3 Sumar las atrasadas en Hoy y devolverlas contadas aparte, para que el texto pueda decir que están incluidas. Implementado como `includesOverdue` calculado por `HoyView` (que ya tiene `overdue.length`) y pasado a `formatDayLoad`, en vez de que el hook las cuente internamente — mismo resultado visible, sin datos duplicados.
- [x] 2.4 Tratar `loading`, `not_connected` y `unavailable` de `useHoyEvents` igual que "sin eventos": el total se calcula lo mismo y no se avisa nada (D-D).

## 3. Interfaz

- [x] 3.1 Mostrar el total en el encabezado de `components/tasks/hoy-view.tsx`, recibiendo el resultado ya calculado por props para no romper la restricción de imports. `useDayLoad` se llama directo en `hoy-view.tsx` (mismo patrón ya establecido por `useHoyEvents` ahí mismo: `components/calendar/` es el puente permitido), no por props desde un componente padre — no hacía falta, no hay restricción que romper.
- [x] 3.2 Componer el texto según D-C: total solo, total + "N sin duración", o solo el conteo cuando nada tiene duración. Nunca "0m planificadas".
- [x] 3.3 Indicar en el texto cuando el total incluye tareas atrasadas.
- [x] 3.4 Sumar el tiempo al encabezado de día de la lista de Próximos, al lado del contador de tareas que ya existe, sin las atrasadas (D-B).
- [x] 3.5 Confirmar que en el panel y el calendario de Próximos no aparece.
- [x] 3.6 Revisar el resultado contra la skill `ui-ux-pro-max` antes de fijar el tratamiento visual: es texto secundario en un encabezado, no un indicador con peso propio, y no lleva color de alerta.

## 4. Tests de interfaz

- [x] 4.1 Tests de `hoy-view` con las combinaciones de D-C, incluida la de "nada tiene duración".
- [x] 4.2 Test de que el total incluye atrasadas en Hoy y no las incluye en Próximos.
- [x] 4.3 Test de que el total se muestra con el calendario desconectado.
- [x] 4.4 Confirmar que `lib/calendar/tasks-and-habits-never-publish-to-google.test.ts` sigue en verde: es el que detecta si el cálculo se coló en `components/tasks/`.

## 5. Documentación y cierre

- [x] 5.1 Sumar el total del día a `docs/product-spec.md`, en las secciones de Hoy y de Próximos.
- [x] 5.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 5.3 Verificar en el navegador con datos reales: un día cargado, un día vacío, un día donde nada tiene duración, y con el calendario desconectado. **No verificado**: `.env.local` apunta al Supabase de producción, y las instrucciones de esta tarea prohíben iniciar sesión ahí. Queda pendiente para quien pueda verificar contra un entorno de prueba.
