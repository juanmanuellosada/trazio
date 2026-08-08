## 0. Precondición

- [x] 0.1 NO empezar hasta que `calendario-scroll-infinito` esté cerrado: reescribe `components/calendar/` entero y este cambio toca el filtrado de bloques (D-D). Verificar que ese cambio está archivado o al menos que sus tareas están completas antes de tocar nada.

## 1. Calendario

- [x] 1.1 Filtrar los bloques de hábito completados de ese día cuando el control de completadas está apagado, con el mismo criterio que ya se aplica a las tareas.
- [x] 1.2 Confirmar que un hábito **salteado** NO se filtra: es el caso que distingue este cambio de "ocultar todo lo que no está pendiente" (D-A, D50).
- [x] 1.3 Verificar que marcar un hábito desde el calendario con el control apagado lo saca de la grilla al instante, sin esperar al servidor.

## 2. Lista de Hoy

- [x] 2.1 Aplicar el mismo filtro al bloque de hábitos de Hoy (D-B).
- [x] 2.2 Dejar el contador "N de M hechos" contando **todos** los hábitos del día, incluidos los ocultos (D-C): es lo que explica por qué la lista es más corta.

## 3. Tests

- [x] 3.1 Tests del calendario: hábito completado oculto, hábito salteado visible, hábito pendiente visible, con el control apagado y encendido.
- [x] 3.2 Test de que los dos interruptores siguen siendo independientes: apagar completadas no saca los hábitos pendientes.
- [x] 3.3 Test del contador de Hoy con hábitos ocultos.

## 4. Cierre

- [x] 4.1 Revisar los rótulos del panel de opciones: ahora los dos controles afectan hábitos y pueden leerse ambiguos juntos (riesgo anotado en design.md). Si hace falta, corregir el texto, no la lógica.
- [x] 4.2 Actualizar `docs/product-spec.md` donde describe la barra de opciones de vista.
- [x] 4.3 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 4.4 Verificar en el navegador: marcar un hábito con las completadas apagadas, en el calendario y en la lista de Hoy.
