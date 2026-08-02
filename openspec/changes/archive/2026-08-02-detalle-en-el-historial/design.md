## Context

El detalle de una tarea es un panel que se monta según un estado en memoria: qué tarea está
abierta. No hay ruta, no hay parámetro en la dirección, no hay entrada de historial y no
hay nada escuchando el botón Atrás. En escritorio es un modal centrado y en teléfono ocupa
la pantalla entera.

Existe además una ruta de tarea suelta, a pantalla completa, que es el destino de "copiar
enlace directo" y "abrir en ventana aparte". Esa ruta sí está en el historial, pero es otra
superficie.

El dato del padre de una tarea ya viene en la consulta y **no se usa en ninguna parte** del
detalle.

Restricciones que condicionan: **D12** (sin estado global), **D28** (el detalle es modal
centrado en escritorio y pantalla completa en teléfono).

## Goals / Non-Goals

**Goals:**

- Que volver atrás cierre el detalle en vez de sacarte de la aplicación.
- Que desde una subtarea se pueda llegar a su padre, y que volver atrás lleve ahí.
- Que cerrar por cualquier vía deje el historial coherente.

**Non-Goals:**

- Darle una ruta propia al detalle. La de tarea suelta ya existe para otra cosa.
- Migas de pan de toda la cadena de ancestros: se muestra el padre directo.
- Navegación entre tareas hermanas.

## Decisions

### D-A. El detalle entra al historial; no se convierte en una ruta

Abrir el detalle **agrega una entrada al historial**; volver atrás la consume y cierra el
panel. La dirección de la página no cambia.

*La alternativa descartada* es darle una ruta o un parámetro en la dirección. Es más
robusto en abstracto, pero choca con lo que ya existe: la ruta de tarea suelta es
justamente eso, y tener dos direcciones distintas que muestran la misma tarea de dos formas
distintas confunde más de lo que resuelve. Además **D28** fija que dentro de la aplicación
el detalle es un modal por encima de la pantalla, no una página.

### D-B. La subtarea sale gratis, y por eso el arreglo es general

Si cada apertura deja su entrada, abrir una subtarea desde el detalle de su padre deja dos
entradas encadenadas, y volver atrás devuelve al padre **sin ninguna lógica especial de
subtareas**.

Es la razón por la que el arreglo se plantea general en vez de resolver solo el caso que
reportó el dueño: el caso reportado es un síntoma, no el problema.

### D-C. Cerrar por cualquier vía tiene que dejar el historial coherente

El detalle se cierra de cuatro maneras: el botón Atrás, la `X`, `Escape`, y hacer clic
afuera. Solo la primera consume la entrada por sí sola.

Las otras tres tienen que **retroceder** en el historial en vez de solo apagar el panel. Si
no, cada apertura y cierre acumula entradas muertas y el botón Atrás empieza a no hacer
nada visible varias veces seguidas — el síntoma clásico de un modal mal metido en el
historial, y peor en el teléfono, donde Atrás es el gesto principal.

### D-D. El padre se muestra y se abre; no es una miga de pan completa

El detalle de una subtarea muestra su **padre directo** y permite abrirlo. No se dibuja la
cadena completa de ancestros.

Las subtareas no tienen límite de anidamiento en Trazio, así que una cadena completa puede
ser larga e impredecible en un modal. El padre directo es lo que se pidió y lo que se usa.

Abrir el padre desde ahí es una apertura más: deja su entrada y volver atrás devuelve a la
subtarea. Coherente con D-A.

## Risks / Trade-offs

**Meter un modal en el historial se rompe fácil, y de formas molestas** → Es el riesgo
central. Los modos de falla conocidos: volver dos veces seguidas se salta un paso; la
flecha de adelante reabre algo que el usuario cerró; recargar con el detalle abierto deja
una entrada huérfana; abrir varias tareas encadenadas y volver atrás se desincroniza; y
cerrar con `X` deja basura que hace que Atrás no haga nada visible. **Cada uno se prueba a
mano; ninguno lo ve un test.**

**Cambia lo que hace el botón Atrás** → Hoy te saca de la aplicación, que es claramente
peor, pero es un cambio de comportamiento observable.

**El teléfono es donde más se nota y donde más se rompe** → Ahí Atrás es el gesto
principal y el detalle ocupa toda la pantalla, así que un error se siente como que la
aplicación se cerró sola.

**Interacción con la ruta de tarea suelta** → Son dos superficies para la misma tarea. Hay
que comprobar que abrir el detalle, ir a la ruta suelta y volver no deja el historial
mezclado.

## Open Questions

- Qué pasa al recargar con el detalle abierto. Como el detalle no está en la dirección, tras
  recargar no puede reabrirse, y la entrada de historial queda sin sentido. Hay que elegir
  entre que Atrás no haga nada visible una vez, o limpiar esa entrada al montar. Se decide
  probándolo.
