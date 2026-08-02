> **Es una sola tanda: todo el cambio vive en el detalle.** No se puede paralelizar
> porque es un único bloque que se reparte en dos.
>
> **El riesgo no es el layout: son los siete atajos.** Funcionan pulsando el disparador
> que está dentro de un contenedor con referencia, y cuando se rompen **no hacen ruido**:
> el atajo simplemente deja de hacer algo. Ningún test de render lo ve.
>
> **El gate en verde no prueba nada acá.** Es enteramente visual y de gestos.

## 1. El ancho del diálogo

- [ ] 1.1 Agregar al componente de diálogo la **variante de ancho con nombre** que haga falta. **No poner una clase de ancho suelta en el detalle** (**D-B**): es la convención del sistema de diseño
- [ ] 1.2 `components/tasks/task-detail-panel.tsx` pide esa variante. El detalle mide hoy 672px, que alcanzaba para una columna
- [ ] 1.3 `docs/design-system.md` enumera las variantes y **esa lista ya quedó corta respecto del código antes de este cambio**. Dejarla al día, o el próximo vuelve a poner una clase suelta porque el documento no le ofrece lo que necesita

## 2. Las dos columnas

- [ ] 2.1 `components/tasks/task-detail-content.tsx`: repartir el bloque único en dos columnas
- [ ] 2.2 Izquierda: título, descripción, subtareas, comentarios
- [ ] 2.3 Derecha: proyecto, fecha, fecha límite, prioridad, etiquetas, recordatorios y **repetición**, que hoy está suelta en el medio. El criterio es **a la izquierda lo que se escribe, a la derecha lo que se elige** (**D-A**), y sirve para resolver cualquier caso dudoso
- [ ] 2.4 **No cambiar qué selectores se usan.** El spec de `selectores-de-atributos` exige que sean los mismos componentes compartidos que usa el alta
- [ ] 2.5 Colapso a una columna cuando el ancho no alcanza. **Los atributos van después del título y antes de la descripción**, nunca al final (**D-C**): al fondo obligarían a desplazarse hasta abajo para cambiar una fecha
- [ ] 2.6 Encontrar el ancho donde conviene colapsar. Es la pregunta abierta del diseño, y el punto de corte del teléfono puede quedar corto: dos columnas pueden dejar de entrar bien antes
- [ ] 2.7 En teléfono sigue a pantalla completa, como hoy

## 3. Lo que no se puede romper

- [ ] 3.1 **No eliminar ni fusionar los envoltorios con referencia** (**D-D**). Mover un bloque de columna es seguro mientras su envoltorio siga envolviendo lo mismo; sacar un `div` que "parecía sobrar" rompe un atajo
- [ ] 3.2 **El texto del botón de subtareas no puede cambiar**: su atajo lo busca por texto literal
- [ ] 3.3 El autoguardado de título y descripción sigue igual
- [ ] 3.4 La ruta de la tarea suelta **no se toca**: es otra superficie
- [ ] 3.5 Actualizar los tests del detalle que asuman la estructura de una columna

## 4. Verificación

- [ ] 4.1 `pnpm lint && pnpm typecheck && pnpm test` en verde
- [ ] 4.2 **Apretar los siete atajos del detalle, uno por uno**: fecha, fecha límite, prioridad, recordatorios, proyecto, etiquetas y subtareas. Es lo primero y lo más importante
- [ ] 4.3 El doble clic sobre el título de una fila sigue abriendo el detalle, y la activación por teclado también
- [ ] 4.4 Mirarlo con **una tarea sin etiquetas, sin recordatorios y sin repetición**: la columna derecha queda casi vacía y la izquierda llena. Es el caso común, no el raro
- [ ] 4.5 Mirarlo también con una tarea cargada de todo
- [ ] 4.6 Probar en un **ancho intermedio**, no solo grande y teléfono: el punto donde dos columnas dejan de entrar es el que hay que encontrar
- [ ] 4.7 En 390px, comprobar que los atributos quedaron **arriba** y no al final
- [ ] 4.8 Editar título y descripción y comprobar que se autoguardan
