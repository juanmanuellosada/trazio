## Context

`app/manifest.ts` declara hoy `id`, `name`, `short_name`, `description`,
`lang`, `start_url`, `scope`, `display`, colores e íconos. No declara
`shortcuts` ni `share_target`.

`start_url` es `/entrar`, una ruta que resuelve el destino según sesión y
preferencia, con un comentario que explica por qué no puede ser `/`. Ese mismo
patrón —una ruta que decide y redirige— es el que sirve para recibir lo
compartido.

## Goals / Non-Goals

**Goals:** que el ícono instalado ofrezca acciones, y que Trazio reciba texto
desde cualquier app del teléfono.

**Non-Goals:** recibir archivos o imágenes (Trazio no tiene adjuntos, decisión
tomada), manejar protocolos, y crear tareas sin que la persona confirme.

## Decisions

### D-A — Lo compartido pasa por el alta rápida, no por un alta silenciosa

La tentación es crear la tarea directo y mostrar un toast. Se descarta: lo que
llega compartido es texto crudo de otra aplicación —un título de artículo, una
selección de un chat— y casi nunca es el título que uno querría. Además, el
parser puede extraer atributos de ese texto, y una extracción sin ver es
justo lo que la regla del parser evita ("ante ambigüedad, extraer menos").

Se abre el alta rápida con el texto puesto y el foco en el campo. Un toque
para confirmar, y de paso se ve qué resaltó el parser.

### D-B — `method: "GET"` y no POST

El destino de compartir puede declararse con `POST` y `multipart/form-data`,
que es lo que hace falta para recibir archivos. Como no recibimos archivos
(no-goal), `GET` alcanza y es mucho más simple: los parámetros llegan en la
URL y una ruta los lee sin parsear un cuerpo.

`title`, `text` y `url` son los tres campos estándar. Cómo los reparte cada
app varía: algunas mandan el título en `title`, otras todo en `text`. La ruta
tiene que combinarlos de forma tolerante y no asumir cuál viene.

### D-C — Los accesos directos apuntan a rutas que ya existen

"Hoy" va a `/hoy`, que ya existe. "Nueva tarea" necesita que el alta se pueda
abrir por URL; si no hay una ruta que lo haga, se resuelve con un parámetro
sobre una pantalla existente en vez de inventar una pantalla nueva.

Dos accesos directos, no seis. La lista larga del menú del ícono se vuelve
ruido, y en algunos sistemas se recorta a cuatro sin avisar.

## Risks / Trade-offs

**[El soporte de `share_target` es desparejo]** → Anda en Android con la PWA
instalada; en iOS no existe. No hay nada que hacer al respecto, y no rompe
nada: donde no está, Trazio simplemente no aparece en el menú de compartir.
Mismo criterio que ya se aceptó con el badge del ícono en Linux.

**[Un texto compartido larguísimo]** → Un artículo entero pegado en el título.
El alta rápida ya maneja texto largo, pero conviene mirar cómo se ve y si
conviene cortar el título y mandar el resto a la descripción.
