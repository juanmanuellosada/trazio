## Context

Trazio no produce audio hoy. No hay `Audio`, no hay `AudioContext`, no hay un solo
archivo de sonido en `public/`. Sería el primero.

El completar de una tarea pasa por **una sola mutación**, y solo dos lugares le mandan el
campo de completado: la casilla de la fila y el detalle. La fila es el mismo componente
en las nueve superficies donde se dibuja —lista, tablero, agrupada, secciones, etiqueta,
filtro, búsqueda, completado—, así que un punto cubre todas.

Los hábitos van por otro lado: dos mutaciones separadas para marcar y desmarcar, con
inserción y borrado en su propia tabla, y sin deshacer.

Restricciones que condicionan: **D12** (sin estado global), **D3** (el tiempo real no
pisa una mutación en vuelo), el veto de `AGENTS.md` a agregar librerías sin decisión
escrita, y la restricción no negociable de que el service worker es solo para push, sin
caché de recursos.

## Goals / Non-Goals

**Goals:**

- Que completar algo se sienta, sin que la aplicación felicite a nadie.
- Que suene una vez, cuando corresponde, y nunca cuando no.
- Que se pueda apagar.
- Que aguante la repetición: es un sonido que se va a escuchar decenas de veces por día.

**Non-Goals:**

- Sonido en otros eventos: crear, borrar, recordatorios.
- Vibración.
- Volumen configurable ni elegir entre varios sonidos.
- Tocar el sonido de las notificaciones push, que lo pone el sistema operativo.

## Decisions

### D-A. Se sintetiza, no se descarga

El sonido se genera con la API de audio del navegador: un oscilador con su envolvente.
Sin archivo y sin librería.

Tres razones, en orden de peso:

**Es lo que mejor sirve al carácter que buscamos.** Un clic corto y neutro es fácil de
sintetizar bien. Los archivos etiquetados como "task complete" tienden a la celebración,
que es justo lo que **D-C** descarta: elegir uno sería pelear contra el material.

**Se afina cambiando números.** Frecuencia, duración, forma de la caída. Si al escucharlo
suena a plástico o a videojuego, se corrige sin volver a buscar material.

**No agrega peso ni licencias.** `AGENTS.md` prohíbe sumar librerías sin decisión escrita,
y no hace falta ninguna.

*Si más adelante el sintetizado no convence*, cambiar la fuente por un archivo es lo único
que habría que tocar: todo lo demás —cuándo suena, el ajuste, las exclusiones— es igual en
los dos casos.

### D-B. El sonido se cuelga de la mutación, jamás de la caché

**Esta es la decisión que hace que todo lo demás salga gratis.**

Va en el callback de éxito de la mutación. No en un efecto que observe los datos, no en un
observador de caché, no en el componente de la fila.

Consecuencias, todas favorables y ninguna que exija una guarda defensiva:

| Caso | Por qué no suena |
| --- | --- |
| **Deshacer** | Hace su propia escritura cruda contra la base; no vuelve a pasar por la mutación |
| **Tiempo real de otro dispositivo** | Solo invalida consultas; nunca toca el punto del sonido |
| **Reversión de una actualización optimista** | El callback de éxito solo corre con confirmación del servidor |

Si alguien lo mueve a un efecto que mire el estado de completado, **las tres se rompen a
la vez**. Queda escrito por eso.

**Y una trampa que sí exige atención:** el autoguardado de la descripción del detalle pasa
por la misma mutación cada vez que el usuario deja de tipear. El sonido tiene que
condicionarse a **la forma del cambio** —que traiga el campo de completado con valor— y
no a "salió bien una mutación de tarea". Si no, suena solo, sin gesto, mientras alguien
escribe.

El discriminador ya existe en el código: hay una función que decide el texto de la tostada
de deshacer distinguiendo completar de descompletar. Es la misma condición.

### D-C. Confirmación, no premio, y el sonido lo tiene que decir

El argumento contra `AGENTS.md` y `copy.md` no es "esto no es gamificación porque lo digo
yo": es que **el sonido concreto tiene que pertenecer a la familia de la confirmación**.

| Sí | No |
| --- | --- |
| Corto, bien por debajo de 200 ms | Cola de reverberación |
| Un solo evento sonoro | Acorde o secuencia ascendente |
| Registro medio, apagado | Agudo y brillante |
| Igual siempre | Que cambie o escale con rachas |

La prueba real no es cómo suena una vez: es **cómo aguanta diez veces seguidas**. Un
sonido que la primera vez es satisfactorio y la décima molesta, está mal elegido.

Nada de variar el sonido según la racha, la prioridad o cuántas tareas van. Eso sería
gamificación con otro nombre.

### D-D. El ajuste es el primer booleano de las preferencias

Columna nueva en `user_preferences`, booleana, con default en verdadero.

Hoy esa tabla no tiene ni un booleano: son enumerados de texto o numéricos. Los booleanos
del proyecto viven en las preferencias por vista, que son `jsonb` por pantalla y **no
corresponden acá**: el sonido es global, no por vista.

**Viene encendido.** Es decisión del dueño y tiene su costo: el proyecto tiene el hábito
de que cuando el sistema pide menos —movimiento reducido— la aplicación **apaga en vez de
atenuar**. Para audio no existe una señal equivalente del sistema, así que el interruptor
propio es lo único que hay, y encenderlo por defecto va contra ese hábito. Se acepta
porque es una aplicación de un solo usuario que lo pidió; con más usuarios, lo correcto
sería al revés.

El spec de configuración exige que **ninguna sección se muestre inerte**, así que el
interruptor no se agrega antes de que el sonido funcione.

### D-E. Los hábitos también, y ahí importa más

Marcar un hábito no tiene deshacer: está escrito que `Ctrl/Cmd+Z` no los cubre, y la única
corrección es desmarcar a mano.

Eso convierte al sonido en información y no en adorno: es la confirmación de que el clic
llegó. En una tarea, si dudás, mirás la tostada de deshacer; en un hábito no hay ninguna.

Marcar suena, desmarcar no. Son dos mutaciones distintas, así que la distinción sale sola.
Hay que agregarle un callback de éxito a la de marcar, que hoy no tiene.

### D-F. Una sola instancia de audio, creada con el primer gesto

El navegador bloquea reproducir audio sin interacción previa. Completar **es** una
interacción, así que el primer sonido ya llega habilitado, pero conviene:

- **Una sola instancia** reutilizada, no una por sonido. Crear una por clic es la vía
  rápida a que el navegador la corte.
- Crearla o reanudarla **con el primer gesto**, no al cargar la página.
- **No precachear nada**: la restricción del service worker prohíbe cachear recursos, y de
  todos modos sin archivo no hay nada que cachear.

Si el navegador igual bloquea, **falla en silencio**: no completar una tarea porque no se
pudo reproducir un sonido sería absurdo. El sonido nunca puede estar en el camino crítico.

## Risks / Trade-offs

**Que canse** → Es el riesgo principal y no lo detecta ningún test. Se ataca con D-C y se
verifica completando diez tareas seguidas, no una.

**Que alguien lo mueva a un efecto** → Rompería a la vez la exclusión de deshacer, la de
tiempo real y la de las reversiones. Por eso D-B queda escrito.

**El autoguardado** → Es el único camino que llega a la mutación sin gesto del usuario. Si
la condición se escribe mal, el sonido suena mientras alguien escribe una descripción.

**Encendido por defecto va contra el hábito de la casa** → Aceptado y anotado en D-D.

**El gate en verde no prueba nada acá** → Se puede testear que la función se llame, pero no
que suene bien ni que no moleste. Eso se escucha.

## Open Questions

- Los parámetros exactos del sonido. Se afinan escuchándolo, no decidiéndolos por escrito.
- Si conviene extraer un componente de interruptor reutilizable o copiar el patrón que ya
  existe pintado a mano en dos lugares. Se decide al ver cuánto se parecen.
