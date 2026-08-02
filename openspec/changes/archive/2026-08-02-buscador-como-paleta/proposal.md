## Why

El dueño quiere que el buscador sea *"un modal de este estilo que vaya buscando a medida que
escribís, con navegación"*, y mostró una paleta de comandos: tareas recientes, resultados que
se filtran al tipear, y accesos de navegación con sus atajos al costado.

Hoy el buscador es **una pantalla**. Apretar `S` te lleva a `/buscar` y **perdés la vista en
la que estabas**. Busca mientras escribís, eso sí, pero **no tiene navegación por teclado**:
no hay flechas, no hay resultado activo, no hay Enter para abrir. Se recorre con Tab.

Dos cosas hacen que esto sea más barato de lo que parece:

**Ningún requisito dice que el buscador sea una pantalla.** Los siete requisitos son de
comportamiento de búsqueda —mínimo de caracteres, orden, acentos, sin corrección de tipeos— y
el del atajo dice *"abrir el buscador"*, no "navegar a". Convertirlo en modal no rompe nada.

**La librería de paleta de comandos ya está instalada** y se usa en cuatro lugares como
desplegable con búsqueda. Sería la primera paleta global, no el primer uso.

Y de paso, algo chico que el dueño pidió junto: el menú del detalle tiene "abrir en ventana
aparte" y falta **"abrir completo en esta ventana"**. La ruta destino ya existe.

## What Changes

**El buscador pasa a ser una paleta de comandos**

- Se abre por encima de la vista actual, sin perderla.
- Filtra mientras se escribe, como ya hace.
- **Con navegación por teclado**: flechas para moverse, Enter para abrir, `Escape` para
  cerrar.

**Suma dos grupos además de los resultados**

- **Visto recientemente**, para volver a lo último sin escribir nada.
- **Ir a**, con los destinos de navegación y sus atajos al costado, que ya existen y ya se
  dibujan en el panel lateral.

**El menú del detalle suma "abrir completo en esta ventana"**

- Navega a la ruta de la tarea suelta sin abrir una ventana nueva. Hoy solo está la versión
  que abre otra ventana.

**Lo que no cambia**

- El comportamiento de búsqueda: mínimo de caracteres, tope de resultados, orden, acentos y
  que sea literal. Nada de eso se toca.
- El atajo `S` sigue siendo el que la abre.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `buscador`: pasa de pantalla a paleta que se abre sobre la vista actual, con navegación por
  teclado, recientes y accesos de navegación.
- `tareas`: el menú de acciones del detalle suma abrir la tarea completa en la misma ventana.

## Impact

**Código.** `components/search/search-view.tsx` se rehace sobre el diálogo de comandos que ya
existe. La ruta `/buscar` **se mantiene**: sigue siendo un destino válido y hay que decidir si
queda como está o pasa a abrir la paleta.

**Reutilización.** La librería ya da el filtrado, las flechas, el Enter y los grupos. Los
destinos de navegación y sus indicadores de atajo ya existen para el panel lateral.

**Recientes.** Es lo único que no existe: hay que decidir dónde se guarda y qué cuenta como
"visto".

**El menú del detalle** es un ítem más: la ruta ya existe y hoy se abre con otra ventana.

**Fuera de alcance.** Comandos que no sean navegar ni abrir una tarea — nada de "crear tarea
desde la paleta" ni ejecutar acciones sobre resultados. Buscar proyectos, etiquetas o
comentarios: hoy el buscador busca tareas y eso no cambia.
