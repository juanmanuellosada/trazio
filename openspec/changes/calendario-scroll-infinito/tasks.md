## 1. Esqueleto del contenedor con desplazamiento

- [x] 1.1 Probar en un caso mínimo que el pegado en dos ejes funciona: encabezado de días pegado arriba y columna de horas pegada a la izquierda, dentro de un único contenedor con desplazamiento horizontal. Es el supuesto que sostiene todo el diseño; si falla, frenar y replantear antes de seguir.
- [x] 1.2 Verificar que el overlay de arrastre de dnd-kit, que aplica `transform`, no rompe ese pegado.
- [x] 1.3 Unificar encabezado, fila de todo el día y grilla horaria en ese contenedor, reemplazando la coincidencia de columnas que hoy resuelven `grid-metrics.ts` y los `grid-template-columns` separados de `all-day-row.tsx` y `time-grid.tsx`.

## 2. Ancho de columna medido

- [x] 2.1 Medir el ancho visible del contenedor con `ResizeObserver` y publicar el ancho de columna como variable CSS: `(ancho − GUTTER_WIDTH_PX) / cantidadDeDías`.
- [x] 2.2 Reemplazar `dayColumnsTemplate` y el `minmax(112px, 1fr)` por ese ancho medido, y confirmar que en pantalla ancha las columnas siguen repartiendo el ancho sin dejar una columna cortada al borde.
- [x] 2.3 Verificar el caso angosto de teléfono con formato semana: siete columnas tienen que entrar sin que aparezca una columna a medias.

## 3. Días como tira continua

- [x] 3.1 Reemplazar `visibleDaysForFormat` por una función que, dado un desplazamiento en días desde hoy y una cantidad de días, devuelva la tira visible, sin anclar al día de inicio de semana. Mantener el caso `mes` aparte.
- [x] 3.2 Convertir el formato a cantidad de columnas (1, 4, 7) conservando los valores guardados de `CalendarFormat` y el guardado por pantalla en `view_preferences`.
- [x] 3.3 Acotar la tira a un año hacia atrás y uno hacia adelante desde hoy.
- [x] 3.4 Cambiar de formato tiene que conservar el día en que empieza el tramo visible.

## 4. Virtualización de columnas

- [x] 4.1 Montar solo las columnas visibles más un margen a cada lado, y verificar que recorrer varios meses no acumula columnas montadas.
- [x] 4.2 Medir el rendimiento con columnas llenas de bloques, no vacías, y recién ahí fijar el tamaño del margen.
- [x] 4.3 Mantener el margen montado durante un arrastre, para que una columna que asoma pueda recibir el bloque.

## 5. Datos por tramos fijos

- [x] 5.1 Pasar `useCalendarRangeEvents` a consultar por tramos de semana ISO, con la clave de caché puesta en el tramo.
- [x] 5.2 Hacer lo mismo con `useHabitScheduleOverridesForRange`, `useHabitSkipsForRange` y `useHabitCompletionsForRange`.
- [x] 5.3 Pedir los tramos que cubren lo visible más dos semanas a cada lado, y comprobar que correrse un día no vuelve a pedir lo ya cargado.
- [x] 5.4 Revisar que la actualización en tiempo real siga invalidando lo que corresponde ahora que las claves cambiaron.

## 6. Navegación

- [x] 6.1 "Hoy" lleva el desplazamiento hasta dejar hoy como primera columna.
- [x] 6.2 Anterior y siguiente corren la vista la cantidad de días visibles, con desplazamiento suave, sin cambiar cuántos días se ven.
- [x] 6.3 La pantalla abre siempre con hoy como primera columna, sin recordar el desplazamiento anterior.
- [x] 6.4 Dejar claro en la barra de navegación qué hacen los botones en mes, donde siguen paginando.
- [x] 6.5 Revisar el rótulo del rango visible, que hoy asume un tramo alineado.

## 7. Arrastre contra el borde

- [x] 7.1 Activar el autodesplazamiento de dnd-kit sobre el contenedor y configurar `measuring` para que los droppables se vuelvan a medir mientras cambia el desplazamiento.
- [ ] 7.2 Si el autodesplazamiento propio de dnd-kit no alcanza, implementarlo sobre el `onDragMove` que ya existe en `calendar-view.tsx`. **Sin verificar** — no se pudo confirmar en el navegador si el autodesplazamiento por defecto de dnd-kit alcanza (ver informe de cierre).
- [ ] 7.3 Verificar que la sombra de destino sigue apuntando al día correcto después de que la vista se corrió. **Sin verificar en vivo** — el código es genérico por `dateKey` (correcto por construcción), pero no se probó el gesto real de arrastre contra el borde.
- [ ] 7.4 Probar el caso del pedido: arrastrar un bloque del domingo hasta el borde derecho, descubrir el lunes y soltarlo ahí. **Sin verificar** — pendiente de prueba manual o e2e.
- [ ] 7.5 Confirmar que el guard de "soltar donde estaba no cambia nada" sigue valiendo cuando la vista se desplazó durante el gesto. **Sin verificar en ese escenario específico** — el guard en sí (`isSameRange`) no se tocó y sigue cubierto por sus tests existentes.

## 8. Táctil

- [x] 8.1 Comprobar que el desplazamiento horizontal convive con el vertical de las 24 horas y que el diagonal no se traba. Verificado con scroll de mouse/trackpad en el navegador real (los dos ejes conviven sin restricción de `touch-action` en el fondo); sin confirmar con un dedo real en un dispositivo táctil.
- [x] 8.2 Confirmar que crear por arrastre sobre el fondo, que exige doble toque, no interfiere con el desplazamiento. Lógica sin cambios de los bloques 1-3, cubierta por los tests existentes de `time-grid.test.tsx`.
- [ ] 8.3 Verificar el arrastre de un bloque con el dedo, incluido el autodesplazamiento contra el borde. **Sin verificar** — necesita un dispositivo táctil real o e2e con emulación táctil.

## 9. Cierre

- [x] 9.1 Decidir y aplicar si la barra de desplazamiento horizontal se muestra u oculta. Se oculta (`no-scrollbar`).
- [x] 9.2 Actualizar los tests que asumen rango anclado o navegación por páginas: `components/calendar/*.test.tsx`, `lib/calendar/layout.test.ts` y los e2e de calendario. Los e2e de calendario no se tocaron: no asumían rango anclado (no hay ninguno en `e2e/*.spec.ts` que dependa del inicio de semana o de paginación).
- [x] 9.3 Agregar cobertura de los escenarios nuevos: correrse un día, cambiar de formato conservando el inicio del tramo, y soltar en un día descubierto durante el arrastre. Los dos primeros tienen test nuevo; el tercero (soltar en un día descubierto durante el arrastre) no se pudo cubrir con un test automático — depende de layout real que jsdom no hace — y quedó como verificación manual pendiente (tarea 7.4).
- [x] 9.4 Registrar en `docs/decisions.md` la decisión de acotar el desplazamiento a un año por lado y la de no persistir la posición. D54. De paso, D55 registra un defecto de CSS descubierto y corregido al verificar en el navegador (`position: sticky; left: 0` no pega un ítem de grilla de una sola columna).
- [x] 9.5 Actualizar `docs/product-spec.md` en la parte de navegación del calendario.
- [x] 9.6 Correr `pnpm lint && pnpm typecheck && pnpm test` y verificar en el navegador, que es donde se ven los defectos de esta clase de cambio. Gate en verde (188 archivos, 1520 tests). Verificado en el navegador: desplazamiento horizontal continuo, virtualización, coexistencia con el desplazamiento vertical, cambio de formato conservando el día, y un defecto real de CSS (D55) encontrado y corregido ahí mismo. No se verificó en el navegador: arrastre de un bloque contra el borde (autodesplazamiento), ni nada con un dispositivo táctil real.
