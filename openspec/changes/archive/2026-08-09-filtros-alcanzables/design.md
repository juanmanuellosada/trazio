## Context

El panel lateral arma, de arriba abajo: cuenta, accesos rápidos, accesos
principales (Bandeja, Hoy, Próximos, Etiquetas, Hábitos, Completado),
favoritos, árbol de proyectos, lista de etiquetas y lista de filtros.

Las dos últimas las arma `label-filter-lists.tsx`, y las dos se esconden
cuando están vacías. Para etiquetas eso no duele, porque Etiquetas además
tiene entrada propia en los accesos principales. Para filtros, esa entrada no
existe.

## Goals / Non-Goals

**Goals:** que se pueda llegar a los filtros sin saber de antemano que
existen.

**Non-Goals:** cambiar el lenguaje de consulta, rediseñar la pantalla de
filtros, y el contenido sembrado del onboarding.

## Decisions

### D-A — Entrada propia, además del estado vacío

Se podría resolver solo con el estado vacío en la lista. No alcanza: esa lista
está al fondo del panel, después del árbol de proyectos, que en una cuenta con
varios proyectos queda abajo de todo y muchas veces fuera de la vista.

La entrada en los accesos principales es lo que pone a Filtros al mismo nivel
que Etiquetas, que es donde corresponde: son las dos formas de cruzar
proyectos.

Las dos cosas, entonces: la entrada arriba para descubrirlo, y la lista abajo
con estado vacío para usarlo.

### D-B — El estado vacío invita, no explica

"Todavía no tenés filtros" y un acceso para crear el primero. Sin un párrafo
enseñando el lenguaje de consulta: eso ya está en la pantalla de alta, que
muestra los errores en español y cuenta las coincidencias mientras escribís.

Un estado vacío que da una clase es un estado vacío que nadie lee.

### D-C — Se quita el enlace del menú de la cuenta

Con la entrada en la navegación, el enlace enterrado sobra. Y dejarlo tiene un
costo: dos caminos al mismo lugar, uno de ellos en un menú cuyo contenido es
"tema, configuración, cerrar sesión". Quien lo encuentre ahí va a dudar de si
es lo mismo.

### D-D — La referencia se aprende tocándola, no leyéndola

Una tabla con diez campos y su sintaxis es documentación, y la documentación
dentro de una aplicación no se lee. Los ejemplos **se insertan al tocarlos**, y
como la vista previa del conteo de coincidencias ya existe y corre en vivo, al
tocar un ejemplo se ve al instante cuántas tareas devuelve *sobre los datos
propios*.

Eso convierte la referencia en un lugar donde se prueba, no donde se estudia.
Y aprovecha una función que ya está construida.

### D-E — La referencia sale de la misma fuente que el parser

`lib/query-language/parse.ts` ya enumera los campos disponibles en el texto de
su error de campo desconocido. Si la referencia los lista por separado, el día
que el lenguaje gane un campo —hay una idea pendiente de sumar `deadline`,
sección y subproyectos— la ayuda va a quedar mintiendo, y una ayuda que miente
es peor que ninguna.

Los dos lugares tienen que derivar de una única lista. Si eso obliga a extraer
una constante compartida, se extrae.

## Risks / Trade-offs

**[Un acceso principal más en un panel ya largo]** → Es una fila. Y el panel ya
lista Etiquetas, Hábitos y Completado, que no son más importantes que Filtros.

**[Elegir la tecla del acorde]** → `G` ya usa `I`, `H`, `P`, `E`, `C` y `A`.
Hay que elegir una libre y verificar la colisión contra el spec de atajos, no
suponerla.
