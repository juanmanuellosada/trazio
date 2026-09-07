## 1. La primitiva compartida

- [x] 1.1 Crear `components/ui/completion-circle.tsx`: círculo con `role="checkbox"`, `aria-checked`, punto interno cuando está marcado, y área tocable de al menos 24×24 que crece fuera del flujo (como hoy hace el calendario con `-inset-1.5`, no ocupando espacio de layout)
- [x] 1.2 Darle los cuatro tamaños que el código ya usa, cada uno con su punto interno: 12px/punto 4px (grilla del calendario), 16px/punto 6px (fila de tarea y fila de hábito de hoy), 20px/punto 8px (detalle de tarea), 24px/punto 8px (tarjeta de hábito). Los cuatro con área tocable de 24×24 como piso. Colapsar la escala a menos tamaños es una decisión de diseño aparte y no entra acá: cada superficie conserva el tamaño visible que tiene hoy
- [x] 1.3 Exponer el color del borde sin marcar como propiedad, con el token neutro (`border-input`) por defecto y la posibilidad de pasar un color resuelto; el estado marcado queda fijo en `border-primary bg-primary` para las cinco superficies
- [x] 1.4 Dejar afuera de la primitiva toda decisión de comportamiento: la etiqueta accesible, el `onClick`, el `tabIndex` y el freno de propagación se pasan desde afuera
- [x] 1.5 Escribir `components/ui/completion-circle.test.tsx`: los cuatro tamaños con su punto interno, el área tocable en los cuatro, el rol y el estado anunciados, el color del borde por propiedad, y que el estado marcado se ve igual pase lo que pase por la propiedad de color

## 2. Migrar las cinco superficies

Cada tarea de este grupo tiene que revisar qué hacía el `<button>` que reemplaza —no solo cómo se veía— y dejar los tests de esa superficie en verde antes de pasar a la siguiente. Ninguna superficie cambia de tamaño visible: lo único que cambia para el usuario es el área tocable de las tres que hoy están por debajo de 24×24.

- [x] 2.1 `components/calendar/calendar-block-chip.tsx`: reemplazar el control inline (líneas ~488-573) por la primitiva en tamaño `sm`, con el color del bloque; conservar el freno del `pointerdown` para que el arrastre del bloque no se lo lleve
- [x] 2.2 `components/tasks/task-row.tsx`: reemplazar por la primitiva en 16px; conservar `tabIndex={cursor ? -1 : undefined}` y confirmar que el área tocable, que pasa de 16×16 a 24×24, no pisa a sus vecinos en la fila
- [x] 2.3 `components/habits/habit-today-row.tsx`: reemplazar por la primitiva en 16px; su área tocable pasa de 16×16 a 24×24
- [x] 2.4 `components/tasks/task-detail-content.tsx`: reemplazar por la primitiva en 20px; su área tocable pasa de 20×20 a 24×24
- [x] 2.5 `components/habits/habit-card.tsx`: reemplazar por la primitiva en 24px; ya cumple el área tocable, no debería cambiar nada visible
- [x] 2.6 `components/public/public-task-row.tsx`: **no se migra.** No tiene este control: usa los íconos `Circle` / `CheckCircle2` de Lucide, no es interactivo, y ya tiene un comentario que explica por qué se aparta de `task-row.tsx`. Se listó por error en la propuesta. Confirmar que sigue igual y seguir
- [x] 2.7 Relevadas todas las copias de `rounded-full border-2` en `components/` y `app/`. Las cinco a migrar son 2.1 a 2.5. Quedan afuera a propósito, porque son muestras de color y no controles de completar: `components/projects/color-swatch-picker.tsx:140` y `:193`, y `components/settings/calendar-form-dialog.tsx:170`

## 3. La forma del bloque

- [x] 3.1 En `calendar-block-chip.tsx`, cambiar `TYPE_SHAPE_CLASS` para que el hábito use el mismo radio que la tarea (`rounded-md`, 6px — ver la salvedad en `design.md`: `--radius-md` no existe y Tailwind cae a su default, pero es el valor que la tarea ya tenía, así que ningún bloque de tarea cambia) y conserve su borde de 1px; la tarea mantiene `border-2` y el evento su barra lateral `border-l-4`
- [x] 3.2 Verificar que el cambio alcanza a las cuatro variantes —`timed`, `bar`, `compact` y `overlay`— para que un mismo hábito se vea igual en la grilla, en la fila de todo el día, en el formato mes y mientras se lo arrastra
- [x] 3.3 Resolver la pregunta abierta del diseño: mirar el bloque de la fila de todo el día (`h-6`, 24px) y decidir si el control le entra en `md` o le conviene `sm`; dejar la decisión escrita en el código, no solo aplicada

## 4. Tests

- [x] 4.1 Actualizar `components/calendar/calendar-block-chip.test.tsx` y `components/calendar/calendar-view.test.tsx`: las afirmaciones sobre `size-3` y `-inset-1.5` ahora apuntan a la primitiva. Actualizarlas, no borrarlas — son el contrato que se está mudando
- [x] 4.2 Agregar a ese mismo archivo el caso que hoy falta: dos hábitos de distinta duración tienen el mismo radio, y una tarea y un hábito del mismo color se distinguen por el grosor del borde
- [x] 4.3 Correr los tests de las otras cuatro superficies migradas y dejarlos en verde

## 5. Documentación

- [x] 5.1 En `docs/design-system.md`, actualizar la tabla de radios para que diga dónde se usa cada uno, incluidos los bloques del calendario, y dejar anotado que un radio de píldora no se usa en superficies cuyo alto es variable
- [x] 5.2 Anotar en el lugar que corresponda las dos cosas que quedaron fuera de alcance: la manija de redimensionar siempre visible, y el hábito cuyo emoji es un ✅ y se lee como un segundo control

## 6. Cierre

- [x] 6.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 6.2 Verificar en el navegador, que es lo único que prueba este cambio: abrir la vista Próximos en formato semana con Hábitos encendido y comparar un hábito de 10 minutos, uno de 45 y uno de 2 horas — los tres con el mismo radio
- [x] 6.3 En el navegador también: una tarea y un hábito del mismo color, en modo oscuro, y confirmar que se distinguen. Es el riesgo que el gate en verde no cubre
- [x] 6.4 Cubierto por test de unidad (aserción de radio sobre la variante `overlay` en `calendar-block-chip.test.tsx`) y por la medición de los 127 bloques de la pantalla, todos en 6px. **No verificado arrastrando de verdad en el navegador**: `.env.local` apunta a producción y soltar el bloque cambiaría el horario del hábito real. Los eventos de puntero sintéticos no activan dnd-kit, así que no hubo forma de mirar el overlay sin escribir datos
