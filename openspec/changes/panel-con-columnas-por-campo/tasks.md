> **El tablero no tiene una sola prueba.** Ni él, ni las dos pantallas que lo montan, ni ninguna de
> punta a punta. Se está por reescribir la parte menos cubierta de la aplicación: **escribí pruebas
> antes de tocar**, o no vas a saber qué rompiste.
>
> **Mover escribe datos de verdad.** Un arrastre que cae en la columna equivocada le cambia la
> prioridad, la fecha o la sección a una tarea real. No es como reordenar, que es cosmético.
>
> **Agrupar por etiqueta queda fuera del panel** por decisión del dueño. Eso simplifica todo: cada
> tarea cae en **exactamente una columna**, así que el identificador de la tarea alcanza como
> identidad de arrastre y no hace falta componerlo con la columna.

## 1. Las columnas salen del agrupador

- [ ] 1.1 El agrupador suma **sección** y **fecha** a sus valores
- [ ] 1.2 "Nada" es **la agrupación natural de la pantalla** (**D-A**): secciones en Bandeja y Proyecto, días en Próximos. Nunca una sola columna
- [ ] 1.3 Quien no toque nada **no debería ver ningún cambio**. Es la prueba de que "nada" quedó bien resuelto
- [ ] 1.4 En lista, el agrupador **sigue haciendo lo mismo que hoy**, etiqueta incluida. No lo toques
- [ ] 1.5 **En panel no se ofrece etiqueta** (**D-B**). Y si la preferencia guardada ya es "etiqueta", el panel se comporta como "nada" **sin pisar el valor**: volver a la lista tiene que encontrarlo intacto
- [ ] 1.6 Cero columnas muestra un estado vacío. Hoy deja **la pantalla en blanco** agrupando por prioridad sin tareas
- [ ] 1.7 Agrupar por fecha genera **tantas columnas como días con tareas**. Con tareas repartidas en meses son decenas: mirá qué pasa y contame si hace falta un límite

## 2. Qué escribe mover

- [ ] 2.1 Sección: la base **rechaza** una sección de otro proyecto. Solo tiene sentido dentro de un proyecto
- [ ] 2.2 Fecha: **hoy borra la hora sin avisar**. Tiene que conservarla
- [ ] 2.3 Prioridad: dominio cerrado de cuatro
- [ ] 2.4 Por **D24**, todos esos campos siguen alcanzables desde el detalle y el menú. Comprobalo, no lo supongas
- [ ] 2.5 Reordenar **dentro** de una columna sigue requiriendo orden manual

## 3. El arrastre que se ve

- [ ] 3.1 Una **capa superpuesta en un portal** (**D-D**). Es lo único que resuelve las tres capas de recorte a la vez
- [ ] 3.2 Hace falta guardar cuál es la tarjeta activa al empezar: hoy no se guarda porque nadie lo necesitaba
- [ ] 3.3 **No alcanza con ensanchar el tablero ni cambiar el desbordamiento**: eso corre el problema una capa más afuera
- [ ] 3.4 Mirá también el apilado: hoy la tarjeta arrastrada puede quedar **por debajo** del fondo de la columna vecina

## 4. La tarjeta y el ancho

- [ ] 4.1 Dos líneas de título. Hoy corta en una, con unos 125px reales, o sea unos dieciséis caracteres
- [ ] 4.2 El panel usa **el ancho disponible** (**D-E**), excepción acotada a **D39**. Lista y calendario **no cambian**
- [ ] 4.3 **Miralo con pocas columnas**, no solo con muchas: tres columnas angostas con un vacío enorme a la derecha es un resultado posible y feo
- [ ] 4.4 El alto de la tarjeta ya es variable —las etiquetas envuelven sin tope—. Con dos líneas de título, mirá si hace falta acotarlo

## 5. Agregar desde el panel

- [ ] 5.1 Agregar tarea **al pie de cada columna**, con el campo de esa columna ya puesto. El componente de alta ya existe y ya recibe todo eso
- [ ] 5.2 Crear sección **solo cuando las columnas son secciones** (**D-F**). En un tablero por prioridad, crear una sección no crea una columna
- [ ] 5.3 Ese control hoy es **privado de su módulo**: hay que exportarlo o extraerlo, sin duplicarlo
- [ ] 5.4 **El atajo de teclado queda muerto en modo panel, en silencio.** Arreglalo junto

## 6. Lo que está roto y se toca igual

- [ ] 6.1 **Dos elementos de lista anidados**: el tablero envuelve la fila y la fila ya devuelve uno. Es marcado inválido y venía dando un error al hidratar
- [ ] 6.2 La columna vacía dice "Sin tareas.", contra la regla de estados vacíos. Con el alta por columna, la acción ya está

## 7. Verificación

- [ ] 7.1 `pnpm lint && pnpm typecheck && pnpm test`
- [ ] 7.2 **Escribí pruebas del tablero antes de tocarlo.** No hay ninguna: ni de él, ni de las pantallas que lo montan, ni de punta a punta
- [ ] 7.3 En el navegador, **arrastrando de verdad**: la tarjeta sale del tablero y sigue al puntero
- [ ] 7.4 Los cuatro agrupadores del panel, en Bandeja, Proyecto, Próximos y Hoy
- [ ] 7.5 **Mover con cada agrupador, comprobando en la base que se escribió el campo correcto** — y solo ese
- [ ] 7.6 Una tarea **con hora**, movida entre días: la hora sigue ahí
- [ ] 7.7 Con el agrupador en "etiqueta" desde la lista: pasar a panel, volver, y que el valor **siga siendo etiqueta**
- [ ] 7.8 Agregar desde cada tipo de columna y comprobar el campo que quedó
- [ ] 7.9 Escritorio ancho, escritorio angosto y 390px
- [ ] 7.10 Si escribís pruebas de punta a punta, **reusá el patrón del ayudante del calendario**: la barra de opciones es un panel desplegable, no controles sueltos. Escritas de memoria nacen rotas

## 8. Lo escrito

- [ ] 8.1 `docs/product-spec.md` describe el modo panel con las columnas cableadas por pantalla
- [ ] 8.2 Una decisión numerada al final de `docs/decisions.md` — **verificá el número, no lo asumas**. Merecen quedar: que el agrupador define las columnas, que etiqueta no se ofrece en panel, y la excepción de ancho frente a D39
- [ ] 8.3 `docs/design-system.md` documenta el tope de ancho del contenido: la excepción del panel va ahí
