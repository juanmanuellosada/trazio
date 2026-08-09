## 1. Acción

- [x] 1.1 Acción en el encabezado del bloque de atrasadas de `components/tasks/hoy-view.tsx`, con Hoy, Mañana y elegir otra fecha. Sin "Sin fecha" (D-C).
- [x] 1.2 Alcanzar la lista `overdue` ya filtrada y ordenada, no la cruda (D-A). Es lo que hace que un filtro rápido acote la acción.
- [x] 1.3 Mostrar el conteo en la acción.
- [x] 1.4 Reusar la mutación de cambio de fecha en lote de `components/selection/selection-action-bar.tsx` y su integración con deshacer. Sin lógica nueva.

## 2. Tests

- [x] 2.1 Test de que reprograma todas las mostradas.
- [x] 2.2 Test de que un filtro rápido activo acota el alcance — es el caso que distingue este cambio de "reprogramar todo lo vencido".
- [x] 2.3 Test de que se deshace como una sola acción.
- [x] 2.4 Test de que no ofrece "Sin fecha".

## 3. Cierre

- [x] 3.1 Actualizar `docs/product-spec.md` en la sección de Hoy.
- [x] 3.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [x] 3.3 Verificar en el navegador con varias atrasadas y un filtro activo. Hecho con Playwright contra Supabase **local** (`e2e/reprogramar-atrasadas.spec.ts`, nunca contra producción — `.env.local` apunta ahí, así que la app real no se tocó). Salieron dos defectos al implementarlo, los dos en el spec, no en la app: un doble popover modal abierto en sucesión sin esperar a que el primero terminara de cerrar (dejaba un fondo inerte bloqueando clics) y una captura tomada a mitad de la transición de apertura del popover (el texto de atrás se veía traslúcido en la foto, no en la app). Corregidos ambos, corrió 6 veces seguidas en verde (incluidas 3 en paralelo) — se promovió a spec permanente en vez de descartarse, porque cubre un flujo de punta a punta (filtro activo + reprogramar + deshacer) que la suite de componentes no ejercita.
