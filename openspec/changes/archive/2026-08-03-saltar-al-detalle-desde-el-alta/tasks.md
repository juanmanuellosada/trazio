> **Es chica de código y delicada de disposición.** El alta tiene dos acciones y le sumamos
> una tercera, en un formulario que en su variante embebida ya está apretado.
>
> **Va después del cambio de distribución** del alta —título y proyecto en la misma fila, y
> las dos últimas filas reagrupadas—, que está en curso. Si va antes, hay que reacomodar los
> botones dos veces.

## 1. La acción

- [x] 1.1 Crear la tarea con lo que haya cargado y abrir su detalle (**D-A**)
- [x] 1.2 **No intentes abrir el detalle sin crear.** El detalle muestra comentarios y subtareas, que cuelgan de una tarea que existe; un editor previo sería otra pantalla con el mismo aspecto y menos capacidades
- [x] 1.3 Que **no se pierda nada**: título con lo que el parser interpretó, descripción, fecha, fecha límite, prioridad, etiquetas, recordatorios y destino
- [x] 1.4 Reutilizar la apertura del detalle que ya existe, que **ya deja su entrada en el historial** — así volver atrás cierra el detalle y no saca al usuario de la aplicación

## 2. Dónde y cómo se ve

- [x] 2.1 En **las dos superficies**: el modal y la embebida
- [x] 2.2 **Visible sin desplegar** (**D-C**), incluso en el modal que abre plegado. Esconderla detrás del desplegado la haría inútil justo para el momento en que hace falta
- [x] 2.3 **Secundaria, no principal** (**D-B**). Si al mirar las tres acciones pesan igual, está mal resuelta: la principal sigue siendo agregar
- [x] 2.4 **El nombre tiene que decir que crea.** Alguien puede pulsarla creyendo que muestra más campos y encontrarse la tarea ya creada. Seguí `.claude/rules/copy.md`
- [x] 2.5 En la variante embebida el espacio es escaso. **Si las tres no entran cómodas, resolvelo, no las encojas hasta que quepan** — y contame cómo

## 3. Verificación

- [x] 3.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 3.2 Desde el modal: cargar todo, saltar al detalle, y **comprobar en el detalle que llegó todo**
- [x] 3.3 Desde el alta embebida en una lista y dentro de una sección
- [x] 3.4 **Desde el alta de una subtarea**, donde no hay selector de destino: que la tarea nueva quede como subtarea del mismo padre
- [x] 3.5 Cerrar el detalle sin tocar nada y comprobar que **la tarea sigue existiendo**
- [x] 3.6 Volver atrás desde ese detalle: tiene que cerrarlo, no sacarte de la aplicación
- [x] 3.7 Con el modal **plegado**: que la acción se vea sin desplegar
- [x] 3.8 En escritorio y en 390px, que es donde tres acciones en una fila se rompen primero
