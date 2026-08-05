## Context

La grilla está bien separada: la matemática es pura y está probada, las constantes de píxeles viven
en un archivo aparte, y un solo componente dibuja los tres tipos de bloque con variantes.

Lo que falta no es estructura, es contenido y respuesta al gesto.

Hechos que condicionan:

**Un bloque muestra solo un ícono y el título**, idéntico midiendo doce píxeles de alto o mil. Y en
la grilla horaria la variante apila el ícono **encima** del título, no al lado, porque su clase de
columna pisa la de fila.

**El tipo que describe un bloque no tiene estado**: no hay dónde decir "esta tarea está hecha".

**Redimensionar ya es instantáneo** —tiene vista previa en vivo con estado local— y **mover no**.
Las dos cosas terminan en el mismo manejador, que es también la razón de que redimensionar un
hábito no haga nada.

**El arrastre no tiene capa superpuesta**: se traslada el nodo original y el contenedor lo recorta.
El tablero resolvió exactamente esto hace unas horas y dejó el precedente escrito.

Restricciones: **D24** (ninguna acción disponible solo por un gesto), **D39** (la columna de
contenido se centra), y la regla del proyecto de que toda superficie arrastrable necesita además un
camino por teclado o menú.

## Goals / Non-Goals

**Goals:**

- Entender el día sin abrir nada.
- Que arrastrar diga a dónde va antes de soltar.
- Actuar sobre un bloque sin salir del calendario.
- Que nada visual espere al servidor.

**Non-Goals:**

- El formato mes.
- Arrastrar en el teléfono.
- Rediseñar los diálogos de alta y edición.
- Que el calendario muestre tareas sin fecha.

## Decisions

### D-A. El contenido del bloque se decide por el alto que tiene

Un bloque de quince minutos mide doce píxeles: no entra ni una línea. Uno de dos horas entra cómodo
con cuatro.

Así que el contenido es **una escalera**, y cada peldaño aparece solo si hay lugar:

| Alto | Evento | Tarea y hábito |
| --- | --- | --- |
| Mínimo | Título | Control de completar + título |
| Más | + horario | + horario |
| Más | + nombre del calendario | + proyecto |
| Más | | + etiquetas |

El control de completar **nunca se cae**: es una acción, no información, y una tarea que no se puede
completar desde donde se la ve obliga a abrir otra cosa.

*La alternativa descartada* es un tamaño mínimo por bloque. Mentiría sobre la duración, que es
justamente lo que un calendario comunica con la altura.

**El orden importa**: primero lo que cambia entre bloques vecinos. Dos reuniones seguidas se
distinguen por el título y la hora, no por el calendario.

### D-B. El color del calendario ya estaba previsto

El spec vigente exige que los tres tipos se distingan **por forma y no únicamente por el color**, y
lo justifica diciendo que el color ya está tomado *"por el calendario de origen del evento"*. O sea
que colorear un evento con su calendario **es lo que el spec espera**, no una excepción a pedir.

Lo que hay que preservar es la otra mitad: la forma sigue distinguiendo los tres tipos —caja,
píldora, barra lateral—, así que dos bloques del mismo color siguen siendo distinguibles. Hay una
prueba que lo afirma y **tiene que seguir pasando**.

Dos cosas a resolver de paso: hay **dos fallbacks distintos** para cuando Google no da el color, y
el color de un evento **no se ajusta al tema oscuro**, a diferencia del de tareas y hábitos.

### D-C. Arrastrar: capa superpuesta, sombra y hora

Tres piezas, y las tres hacen falta:

**La capa superpuesta**, en un portal, igual que el tablero. Es lo único que evita que el contenedor
recorte el bloque. Ensanchar o cambiar el desbordamiento corre el problema una capa más afuera.

**La sombra en el origen**: el hueco de donde salió queda marcado mientras dura el gesto. Sin eso,
soltar en el lugar equivocado no tiene referencia de dónde estaba.

**La hora de destino**, visible mientras se mueve y **ajustada a la grilla** de quince minutos, que
es lo que efectivamente se va a guardar. Mostrar la hora libre del puntero y guardar otra sería
mentir.

### D-D. Todo lo visual es instantáneo, incluida la pregunta por la serie

Redimensionar ya lo es y es el modelo: estado local que se actualiza en cada movimiento, y la
escritura después.

Mover tiene que igualarlo. Y hay un caso que hoy hace exactamente lo contrario: al soltar una
ocurrencia de una serie, **el bloque salta de vuelta al origen mientras el diálogo pregunta el
alcance**. Se queda donde lo soltaste, y si se cancela, vuelve.

Y hay que tapar el agujero de Próximos, donde arrastrar una tarea **no es optimista** porque su
caché no se parchea ni se invalida.

### D-E. Menú contextual, y qué ofrece cada tipo

Clic derecho en cualquier bloque, con la primitiva que ya existe. Es además lo que la regla del
proyecto exige: una superficie arrastrable necesita otro camino.

| Tipo | Menú |
| --- | --- |
| Evento | Editar · Abrir en Google Calendar · **Eliminar** |
| Tarea | Abrir detalle · Completar · Eliminar |
| Hábito | Editar · Completar · **Saltear este día** |

**Eliminar un evento** va también en el diálogo de edición, con confirmación — hoy no está en
ninguno de los dos lados, y el gancho existe con un solo consumidor en toda la aplicación.

**Ojo con el patrón**: la lista de menú se escribe hoy **dos veces**, casi idéntica, en la fila de
tarea y en la de evento. Este sería el tercer copiado.

### D-F. Saltear un hábito es capacidad nueva

No existe nada parecido. Lo más cercano quita una reprogramación y devuelve el hábito a su hora
habitual.

**La decisión del dueño resuelve lo que más pesaba**: *"si en un hábito me salteé un día, ese día
queda ahí fijo en el calendario. Si yo después lo completo se actualiza la racha."*

O sea que saltear:

- **No saca el bloque del calendario.** Se queda, marcado como salteado. Es una decisión a la vista,
  no una baja.
- **Es reversible**: se puede completar después, y ahí la racha se actualiza como cualquier otro día.
- **No toca el cálculo de rachas.** La racha cuenta cumplimientos; saltear no suma ni resta, solo
  deja de estar pendiente.

Eso desactiva el riesgo grande de esta propuesta: **no hay que meter mano a las rachas**. Lo que sí
hace falta es dónde guardar ese estado por día, y probablemente sea una migración.

*La alternativa descartada* era que saltear preservara la racha como si el día no contara. Suena
generoso y es peor: vuelve la racha un número que el usuario puede inflar salteando, y deja de
significar lo que dice.

### D-G. El ancho, cuarta copia de la misma excepción

El calendario hereda el tope de la columna de contenido. Sacárselo es la misma excepción que el
panel ya tiene, por la misma razón: una grilla de siete columnas no es una línea de texto.

Pero esa excepción está escrita **tres veces**, una por pantalla, con el mismo comentario. Sumar la
cuarta pide unificarlo primero.

La grilla ya tiene piso y reparto por columna, así que quitarle el tope alcanza: no hay que tocar la
geometría.

## Risks / Trade-offs

**Meter cuatro datos en un bloque puede verse peor, no mejor.** Es el riesgo principal y no se
mitiga razonando: se juzga mirando una semana real, con bloques de quince minutos y de tres horas
mezclados, no dos de prueba.

**Un control de completar dentro de algo arrastrable** compite con el gesto. Hay que poder tildar
sin que empiece a moverse, y arrastrar sin tildar sin querer.

**Tocar las rachas de los hábitos** → D-F, con su salida escrita.

**Romper la distinción por forma** → si al colorear los eventos alguien afloja la forma, dos bloques
del mismo color dejan de distinguirse. Hay una prueba que lo cubre y **tiene que seguir pasando tal
cual**: si falla, el arreglo es la forma, no la prueba.

**Casi nada de esto tiene red.** No hay pruebas de la línea de hora, del arrastre completo, del
redimensionado ni del ancho. Y la suite de punta a punta del calendario **no corre en el gate** —
estuvo rota por selectores viejos y nadie se enteró.
