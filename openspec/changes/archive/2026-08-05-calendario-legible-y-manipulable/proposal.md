## Why

El calendario **se mira pero no se usa**. Un bloque muestra un ícono y el título truncado, nada
más: ni hora, ni de qué calendario viene, ni de qué proyecto. Y desde ahí no se puede completar una
tarea, ni borrar un evento, ni hacer nada con un hábito salvo moverlo. No hay clic derecho en
ningún bloque.

El dueño trajo el calendario de Google como referencia y pidió, en resumen: **que se vea más
sobrio, que muestre lo que hace falta para entender el día de un vistazo, y que arrastrar sea
instantáneo** — *"cualquier arrastrar o agrandar ancho tiene que ser INSTANTÁNEO por más que el
cambio se efectúe después"*.

El relevamiento encontró cinco cosas que no se ven desde afuera y que este cambio arregla:

- **La línea de la hora actual está congelada.** Se calcula una sola vez al cargar y nunca más. El
  spec dice que se mueve con el tiempo; el código no lo cumple.
- **No hay capa superpuesta al arrastrar**: el contenedor con desplazamiento recorta el bloque, el
  mismo problema que el tablero ya resolvió.
- **Arrastrar una tarea en Próximos no es optimista**: su caché no se parchea ni se invalida, así
  que el bloque no se mueve hasta que vuelve del servidor.
- **Redimensionar un hábito no hace nada**, porque mover y redimensionar comparten el mismo manejador
  y la rama de hábito solo lee la hora de inicio.
- **"Saltear un hábito ese día" no existe en toda la aplicación.** No es una función escondida: hay
  que crearla.

## What Changes

**Lo que muestra cada bloque, si entra**

| Tipo | Muestra |
| --- | --- |
| Evento | Título, horario, y el nombre de su calendario. Con **el color de su calendario** |
| Tarea | Título, hora de inicio y fin, su proyecto, y sus etiquetas. Más un **control para completarla** |
| Hábito | Lo mismo que una tarea, más una **marca que dice que es un hábito** |

**Si entra** es literal: hoy el contenido es idéntico en un bloque de quince minutos y en uno de ocho
horas, y en la grilla el ícono queda apilado **encima** del título en vez de al lado.

**Arrastrar deja de ser a ciegas**

- El bloque sigue al puntero **sin recortarse** al salir de la grilla.
- Mientras se arrastra, **se ve a qué hora quedaría** y **queda su sombra en el origen**.
- Al soltar, el bloque **se queda donde lo dejaste**, siempre, aunque el servidor conteste después.
- Si es una ocurrencia de una serie, **se pregunta el alcance** — solo este, o este y los
  siguientes. Eso ya existe, pero hoy el bloque **salta de vuelta al origen** mientras pregunta.

**Se puede actuar sobre un bloque sin salir del calendario**

- Clic derecho en cualquier bloque, con la primitiva que ya usan la fila de tarea y la de evento.
- **Borrar un evento**, desde el menú y desde el diálogo de edición, con confirmación.
- **Completar una tarea o un hábito** desde su bloque.
- **Saltear un hábito** ese día.

**Y lo visual**: la línea de la hora actual pasa a ser **roja** y **a moverse**, y el calendario usa
el ancho disponible en vez de detenerse en el tope de la columna de contenido.

**Nada de esto rompe el contrato vigente.** El spec ya anticipa que un evento lleve el color de su
calendario —lo dice al justificar por qué los tres tipos se distinguen por forma—, así que colorearlos
es implementar lo que estaba escrito, no cambiarlo. Y el spec ya exige que la línea de la hora actual
se mueva: hoy no se cumple.

## Capabilities

### Modified Capabilities

- `vista-calendario`: qué muestra cada bloque, el color de un evento, la línea de la hora actual, el
  ancho, la retroalimentación al arrastrar, las acciones sobre un bloque y su menú contextual.
- `pantalla-habitos`: un hábito se puede saltear un día puntual, que hoy no existe.

## Impact

**Saltear un hábito no existe y probablemente pida una migración.** Lo más parecido que hay quita
una reprogramación y devuelve el hábito a su hora habitual — no lo saltea. Es la única parte de esta
ronda que puede tocar la base, y si la toca, **la migración va antes que el código**.

**El bloque no sabe si algo está cumplido.** El tipo que los describe no tiene ningún campo de
estado, así que un hábito hecho y uno pendiente se dibujan idénticos. Mostrar un control de
completar exige sumar ese dato.

**La caché de Próximos.** Es un agujero real y anterior a esto: arrastrar una tarea ahí depende de
que llegue el aviso en tiempo real. Se arregla acá porque contradice de frente lo que se pide.

**Dos fallbacks distintos para el mismo color.** Cuando Google no da el color de un calendario, la
grilla usa gris y la fila de Hoy usa otro. Conviene unificarlo ahora que el color pasa a importar.

**El color de un evento viene crudo de Google y no se ajusta al tema oscuro**, a diferencia del de
tareas y hábitos, que sí. Con los eventos coloreados eso se va a notar.

**El ancho ya tiene precedente**: la excepción del panel está escrita **tres veces**, una por
pantalla. Sumar el calendario sería la cuarta copia; conviene mirar si se unifica.

**Lo que ya está bien y no hay que romper**: redimensionar **sí** es instantáneo hoy —tiene vista
previa en vivo— y es el modelo a seguir para lo demás. Mover un evento **sí** es optimista.

**Red de seguridad, en detalle.** Nada prueba la línea de la hora actual, ni el arrastre de punta a
punta, ni el redimensionado, ni el ancho. La suite de punta a punta del calendario **no corre en el
gate**, y su ayudante estuvo roto por selectores viejos hasta hoy sin que nadie lo notara.

**Fuera de alcance**: el formato mes, que no tiene arrastre y donde no entra nada de esto; y
arrastrar en el teléfono, que sigue sin sensor táctil en toda la aplicación.
