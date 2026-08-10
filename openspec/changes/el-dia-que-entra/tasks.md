## 0. Gobernanza

- [x] 0.1 Anotar D61 en `docs/decisions.md`: la carga del día compara contra el tiempo libre real, sin dejar de ser un dato que no juzga a la persona; se rechaza horario laboral y franjas de disponibilidad.
- [x] 0.2 Actualizar `docs/product-spec.md`: §3 "Hoy" (nuevo encabezado y "¿Qué hago ahora?"), §11 "Configuración" (hora de fin del día) y §13 "Fuera de alcance" (nueva entrada sobre horario laboral y franjas).
- [x] 0.3 Esta propuesta de OpenSpec (`proposal.md`, `design.md`, `tasks.md`, spec deltas de `carga-del-dia`, `que-hago-ahora`, `configuracion`, `esquema-datos` y `atajos-de-teclado`).

## 1. Esquema y primitiva de huecos libres

- [ ] 1.1 Migración: `user_preferences.day_end_time`, `time not null default '22:00:00'`, mismo patrón que `20260802030000_user_preferences_reference_time.sql`.
- [ ] 1.2 `pnpm db:types` tras aplicar la migración.
- [ ] 1.3 `lib/planning/free-gaps.ts`: `computeFreeGaps({ now, dayEnd, busyBlocks })`, fusiona bloques superpuestos, recorta contra `[now, dayEnd]`, devuelve los huecos ordenados (D-B) + test (bloque pasado, bloque en curso, sin bloques, día terminado).
- [ ] 1.4 `components/calendar/use-free-gaps.ts` (o extensión de `use-day-load.ts`): arma `busyBlocks` desde eventos con horario, tareas con `due_at` de hoy y hábitos con hora efectiva de hoy, llama a `computeFreeGaps`. Vive en `components/calendar/`, nunca en `components/tasks/` (prohibición existente).

## 2. Carga del día: tiempo libre y pedido sin lugar

- [ ] 2.1 `lib/planning/day-load.ts`: separar el cálculo existente en comprometido (con hora) y pedido sin lugar (sin hora), reusando la clasificación ya existente + test.
- [ ] 2.2 Sumar los huecos de `computeFreeGaps` para el tiempo libre total; clampear a cero cuando `now > dayEnd` + test.
- [ ] 2.3 Encabezado de `components/tasks/hoy-view.tsx`: reemplazar "Xh Ym planificadas" por "Te quedan Xh Ym libres y Ah Bm de tareas sin agendar", con el aviso cuando lo pedido no entra, sin color de alerta ni ícono.
- [ ] 2.4 Caso "nada tiene duración": no mostrar la cláusula de "sin agendar", igual que hoy no se muestra "0m planificadas".
- [ ] 2.5 Caso "día terminado": mostrar que el día terminó en vez de "0m libres".
- [ ] 2.6 Test de componente del encabezado nuevo de Hoy.

## 3. "¿Qué hago ahora?"

- [ ] 3.1 `lib/planning/next-task.ts`: dado el primer hueco de `computeFreeGaps` y el pool de pedido sin lugar de Hoy, filtra por duración (requisito duro) y ordena por atraso, `deadline`, prioridad y `position` (D-D) + test de cada paso del criterio.
- [ ] 3.2 Descartar huecos de menos de 5 minutos (D-E) + test.
- [ ] 3.3 Botón "¿Qué hago ahora?" en el encabezado de Hoy, junto al tiempo libre, con los tres estados: propone una tarea, avisa que está ocupado hasta tal hora, avisa que ninguna tarea entra.
- [ ] 3.4 Test de componente de los tres estados.

## 4. Configuración y atajo

- [ ] 4.1 Selector de "hora en que termina el día" en la sección General de Configuración, default 22:00.
- [ ] 4.2 Verificar contra `lib/shortcuts/` qué tecla suelta está libre (D-F: candidatas `I`, `H`, `P`, `C`, `A`, `F` fuera del acorde `G`, a confirmar) y registrar el atajo de "¿Qué hago ahora?" en la pantalla Hoy.
- [ ] 4.3 Confirmar que `indicadores-de-atajo` muestra el indicador del atajo nuevo en el botón sin cambios en esa capacidad (ya cubierto por su requisito general).

## 5. Cierre

- [ ] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 5.2 Verificar en el navegador (dos pestañas, D-61 de auto-memoria: verificar en el navegador de verdad, no solo el gate en verde): un día con hueco y candidata, un día sin hueco, un día con hueco pero sin candidata, un día ya terminado, una cuenta sin calendario de Google conectado.
- [ ] 5.3 Verificar que cambiar la hora de fin del día en Configuración recalcula el tiempo libre de Hoy sin recargar.
