## 1. Acción

- [ ] 1.1 Acción en el encabezado del bloque de atrasadas de `components/tasks/hoy-view.tsx`, con Hoy, Mañana y elegir otra fecha. Sin "Sin fecha" (D-C).
- [ ] 1.2 Alcanzar la lista `overdue` ya filtrada y ordenada, no la cruda (D-A). Es lo que hace que un filtro rápido acote la acción.
- [ ] 1.3 Mostrar el conteo en la acción.
- [ ] 1.4 Reusar la mutación de cambio de fecha en lote de `components/selection/selection-action-bar.tsx` y su integración con deshacer. Sin lógica nueva.

## 2. Tests

- [ ] 2.1 Test de que reprograma todas las mostradas.
- [ ] 2.2 Test de que un filtro rápido activo acota el alcance — es el caso que distingue este cambio de "reprogramar todo lo vencido".
- [ ] 2.3 Test de que se deshace como una sola acción.
- [ ] 2.4 Test de que no ofrece "Sin fecha".

## 3. Cierre

- [ ] 3.1 Actualizar `docs/product-spec.md` en la sección de Hoy.
- [ ] 3.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 3.3 Verificar en el navegador con varias atrasadas y un filtro activo.
