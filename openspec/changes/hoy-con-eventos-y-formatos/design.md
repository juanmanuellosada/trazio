## Context

Hoy es la única vista de tareas sin selector de formato: monta la barra con la bandera apagada, y
su cuerpo es una secuencia fija —alta rápida, Atrasadas, Hoy, hábitos, **eventos**, completadas—.
Los eventos ya están, en un bloque propio al final.

Tres hechos del código que condicionan todo lo que sigue:

**En Hoy no hay arrastre.** El orden por defecto es por fecha, no hay contenedor de arrastre
montado, y la manija ni se dibuja. El conflicto que uno esperaría —intercalar por hora contra un
orden manual— **no existe acá**. Es lo que vuelve barata la parte del orden.

**Las tareas ya no esperan a Google.** Son dos consultas hermanas, cada una con su estado. El bloque
de eventos devuelve nada mientras carga y nada si falla. Esa independencia es una propiedad que hay
que conservar, no construir.

**`TaskRow` está casada con el tipo tarea.** Cuatro mutaciones adentro, campos leídos sin
abstracción, enlaces a `/tarea/{id}`, subtareas recursivas, veintisiete ítems de menú. Lo único
genuinamente reusable es su esqueleto visual y el par menú contextual + menú de acciones, que ya
está desacoplado en las primitivas.

Restricciones: **D24** (ninguna acción disponible solo por un gesto), **D28** (el detalle es un
modal centrado), **D41** (la fila crece en niveles, con lo de la derecha anclado).

## Goals / Non-Goals

**Goals:**

- Ver el día como una secuencia, no como dos listas.
- Distinguir un evento de una tarea sin leer.
- Editar un evento desde donde se lo ve.

**Non-Goals:**

- Eventos en el panel.
- Eventos en cualquier otra vista de lista.
- Completar, priorizar o anidar un evento.
- Que el contador cuente eventos.

## Decisions

### D-A. El orden: tres tramos, no uno

| Tramo | Qué | Por qué |
| --- | --- | --- |
| 1 | Eventos de todo el día, y los que vienen de días anteriores | Enmarcan la jornada; no ocupan un momento |
| 2 | Todo lo que tiene hora, eventos y tareas juntos, por hora | Es el pedido |
| 3 | Tareas sin hora | Ya es el orden de "ordenar por fecha": con hora antes que sin hora |

Un **evento que empezó antes de hoy** va al tramo 1 y no al 2. Si fuera por su hora de inicio,
aterrizaría en la madrugada de hoy, que es un momento en el que no pasó nada. Además, mostrar su
hora de inicio cruda **es el defecto que hay hoy**: dice la hora de ayer.

*La alternativa descartada* es un solo tramo por hora, con las tareas sin hora al principio. Pone lo
menos urgente arriba y deja el día sin cabecera.

**El empate importa**: una tarea y un evento a la misma hora. Va primero el evento —es un compromiso
con otra gente, la tarea se puede correr—, y con eso el orden queda total y estable, sin depender de
en qué orden llegaron las dos consultas.

### D-B. El panel muestra solo tareas, y lo dice

Las columnas del panel salen de un criterio de agrupación: prioridad, etiqueta, sección. **Un evento
no tiene ninguna de las tres**, así que caerían todos juntos en la columna de "sin nada", que es
exactamente donde no aportan.

Una columna "Eventos" fija sería inventar un cuarto criterio que convive mal con los otros tres: al
agrupar por prioridad tendrías tres columnas de prioridad y una que no es una prioridad.

Y el costo no es menor: la tarjeta del panel **es** una fila de tarea, con el tipo adentro. Meterle
otra cosa pide un `renderItem` y un identificador de arrastre discriminado.

**Pero omitir en silencio no**: con el panel activo y eventos en el día, va una línea que dice que
este formato no los muestra, y cómo verlos. Sin eso, alguien mira el panel y concluye que no tiene
reuniones.

### D-C. Fila hermana, esqueleto compartido

Un `EventRow` propio, que reusa las clases del contenedor y la estructura de dos niveles de la fila
de tarea, y arma su propio menú con la primitiva que ya existe.

**Lo que la fila de evento no lleva**: casilla de selección, manija de arrastre, chevron, casilla de
completar, punto de prioridad. Cinco controles menos, y esa ausencia **es** la señal de que no es
una tarea: donde la tarea tiene un círculo para tildar, el evento no tiene nada.

**Lo que sí lleva**, siguiendo D41:

| Nivel | Izquierda | Derecha |
| --- | --- | --- |
| 1 | Marca del color del calendario, título | Nombre del calendario |
| 2 | Rango horario, ubicación si tiene | |

El nombre del calendario cae donde la tarea pone su proyecto. Es la misma pregunta —¿de dónde viene
esto?— y conviene que se responda en el mismo lugar.

**Ojo con dos trampas heredadas.** Hay una prueba que busca el punto de prioridad con un selector de
CSS crudo, por ser redondo y estar oculto a los lectores: la marca de color no puede tener esas dos
características. Y la fila de tarea llama al gancho de arrastre incondicionalmente, aun sin
contenedor: no copies eso.

### D-D. Editar: el gesto, más dos caminos

Doble clic abre el diálogo de edición que ya existe. Por **D24** hace falta más de un camino, así
que la misma acción va en el menú contextual y en el botón de acciones, que comparten una sola lista
igual que en la fila de tarea.

El menú del evento es corto: **Editar**, **Abrir en Google Calendar**, y **Eliminar** como
destructiva. Nada de fecha, prioridad, subtareas ni duplicar: no existen para un evento.

**Calendario de solo lectura.** El permiso vive en el calendario, no en el evento, así que hay que
cruzar. Cuando no se puede escribir, el diálogo **se abre igual, sin permitir editar**, y dice por
qué. Las alternativas son peores: no hacer nada deja al usuario pulsando dos veces sin respuesta, y
ofrecer el formulario completo termina en un rechazo de Google después de que escribió.

**En teléfono no hay doble clic**: la fila de tarea ya resuelve eso abriendo con un toque. El evento
sigue la misma regla, para que el gesto no dependa del tipo de fila.

### D-E. Los eventos llegan después, y se nota

Conservar la independencia tiene un costo visible: las tareas se pintan primero y **las filas de
evento se insertan después, empujando a las tareas hacia abajo**.

Se acepta, y no se disimula con un esqueleto de carga: reservar el lugar exige saber cuántos eventos
va a haber, que es justamente lo que todavía no se sabe. Un esqueleto del alto equivocado salta dos
veces en vez de una.

Lo que **no** se puede hacer es lo contrario: esperar a Google para pintar las tareas. Es la
propiedad que hoy existe y la que más fácil se rompe sin querer, con un `Suspense` o un
`isLoading` compartido.

| Estado de Google | Qué se ve |
| --- | --- |
| Sin conectar | Exactamente lo de hoy. Sin huecos, sin avisos, sin lugar reservado |
| Cargando | Las tareas, ya ordenadas entre sí |
| Falla pasajera | Las tareas, más **un** aviso al pie. Nunca uno por fila |
| Sin eventos hoy | Las tareas, sin ninguna marca |

### D-F. El calendario de Hoy: modo día, fijo y sin navegación

El modo día ya es un valor válido y ya se persiste por pantalla, así que no hace falta migración. En
Hoy **se fuerza al dibujar**, no se lee de lo guardado: no hay valor previo posible —Hoy nunca
ofreció calendario— y forzarlo no puede romperse.

**El selector de formato de calendario no aparece en Hoy.** Deshabilitado sería peor: un control
apagado invita a preguntarse cómo encenderlo, y acá la respuesta es que nunca.

Y la navegación entre días **tampoco**. En una vista llamada Hoy, un control para ir a mañana es una
contradicción: si querés mañana, la vista es Próximos.

## Risks / Trade-offs

**Perder el desacople con Google** → D-E. Es el riesgo más serio y el más fácil de introducir sin
querer. Se verifica con Google caído, no razonando sobre el código.

**El salto al llegar los eventos** → D-E, asumido. Puede molestar más de lo que parece por escrito,
y solo se juzga mirándolo con una conexión lenta.

**Una fila que se parece a una tarea pero no lo es** → D-C. Si el tratamiento queda tímido, alguien
va a buscar la casilla para tildar un evento. Se juzga mirando una lista mezclada, no una fila
sola.

**Hoy casi no tiene pruebas** → una sola, sobre centrado, con todo mockeado. Lo que se rompa acá no
lo va a atajar el gate.

**Dos fuentes con relojes distintos** → los eventos traen zona horaria propia y las tareas usan la
del usuario. Un orden por hora que mezcle las dos tiene que comparar instantes absolutos, nunca
textos de hora.
