## 0. Gobernanza

- [ ] 0.1 Anotar la decisión nueva en `docs/decisions.md` (texto entregado en el informe de esta propuesta, para aplicar serializado — no lo edita quien implemente este change).
- [ ] 0.2 Actualizar `docs/product-spec.md` §2 "Hábito" y §3 "Hábitos" (texto entregado en el mismo informe, mismo motivo).
- [ ] 0.3 Esta propuesta de OpenSpec (`proposal.md`, `design.md`, `tasks.md`, spec delta).

## 1. Ventana compartida de 30 días

- [ ] 1.1 `lib/habits/habit-history.ts`: agregar `CONSTANCY_WINDOW_DAYS = 30`, dejando `MINI_MAP_DAYS = 14` intacto para el recorte visual del mini-mapa.
- [ ] 1.2 `lib/habits/get-habit-completions-history.ts` y `lib/habits/get-habit-skips-history.ts`: extender el rango de la consulta de `MINI_MAP_DAYS` a `CONSTANCY_WINDOW_DAYS` (D-A).
- [ ] 1.3 `lib/habits/use-habit-completions-history.ts` y `lib/habits/use-habit-skips-history.ts` (o el módulo cliente equivalente de salteos): mismo cambio de rango del lado cliente.
- [ ] 1.4 Ajustar los tests existentes de estos módulos a la ventana nueva.

## 2. Cálculo de constancia

- [ ] 2.1 `lib/habits/consistency.ts`: función que recibe el hábito (frecuencia, `created_at`), las fechas cumplidas y las fechas salteadas dentro de la ventana, y el `now`/timezone, y devuelve `{ numerator, denominator, unit: 'días' | 'semanas' }` o `null` cuando no hay datos suficientes (D-E) — con la lógica de D-A a D-D (recorte por creación, exclusión de salteos, margen de gracia de hoy, ramas por tipo de frecuencia) + tests cubriendo cada escenario del spec delta.
- [ ] 2.2 `lib/habits/format.ts`: `formatConsistency` que arma el texto ("28 de los últimos 30 días" / "3 de las últimas 4 semanas" / el aviso de datos insuficientes) + test.

## 3. Contador de repeticiones

- [ ] 3.1 `lib/habits/repetitions.ts`: `getHabitRepetitionsCount`/`useHabitRepetitions`, un conteo por hábito (`count: 'exact', head: true` sobre `habit_completions` filtrado por `habit_id`, D-F) — mismo armado en paralelo que `use-habit-streaks.ts` + test.

## 4. Cableado en la tarjeta y en la pantalla

- [ ] 4.1 `components/habits/habit-card.tsx`: mostrar constancia y repeticiones junto a la racha actual y la mejor racha.
- [ ] 4.2 `components/habits/habits-view.tsx`: línea de referencia al pie de la pantalla (D-H), una sola vez.
- [ ] 4.3 Actualizar los tests de componente de `habit-card.test.tsx` y `habits-view.test.tsx` para los elementos nuevos.

## 5. Cierre

- [ ] 5.1 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 5.2 Verificar en el navegador: un hábito con historial real, un hábito recién creado, un hábito con algún salteo, y las tres frecuencias, cada uno mostrando constancia y repeticiones coherentes con lo que se ve en el mini-mapa.
