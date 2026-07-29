## Context

La fase 1 construyó la funcionalidad y no el vocabulario visual que la sostiene. La lista de problemas del dueño, tras usar la app por primera vez, no tiene un solo bug funcional: son todos de interfaz.

Este design existe para resolver los **choques** entre lo que él pide y lo que ya está decidido y escrito, y para fijar el orden de trabajo, que en este cambio importa más que en ninguno: casi todo se construye sobre las mismas primitivas, y hacerlas al final significa rehacer lo de arriba.

## Goals / Non-Goals

**Goals:**

- Que ningún control interactivo de la aplicación sea el que trae el navegador.
- Que el alta de una tarea sea un solo componente, usado en todas las superficies.
- Resolver los choques con decisiones ya tomadas de forma explícita, actualizando el documento que corresponda en vez de dejar código y spec en desacuerdo.
- Dejar el orden de implementación fijado por dependencia real, no por prioridad percibida.

**Non-Goals:**

- No se implementa nada de la fase 2 —barra de opciones de vista, Próximos, administración de etiquetas, recordatorios— aunque aparezca en las referencias visuales.
- No se rediseña la landing: quedó resuelta aparte.
- No se toca el parser ni el esquema, salvo lo que el color personalizado exija.

---

## Decisions

### A. La regla que ordena todo

**A1 — Todo control interactivo es propio.** Nada de campos de fecha, hora, color ni selección nativos; nada de `confirm`, `alert` ni `prompt`. La auditoría del código encontró exactamente cuatro incumplimientos hoy: tres campos de fecha en el detalle de tarea (`type="date"` dos veces y `type="datetime-local"` una) y un `window.prompt` pidiendo la URL de un enlace en el editor de descripción.

Cuatro es poco, y eso es buena noticia: el problema no es que la app esté llena de elementos nativos, es que los pocos que hay están en los lugares más visibles y que **faltan** los componentes ricos que deberían ocupar su lugar.

**A2 — Las primitivas van primero.** Capas superpuestas, diálogos, menús contextuales y selectores desplegables son la base de todo lo demás: el alta de tareas, los selectores de fecha y prioridad, el modal de detalle, el de proyecto, el de configuración y el menú del editor se construyen encima. Hacerlas al final obliga a rehacer todo lo de arriba.

Ya existen componentes de shadcn que sirven de base —diálogo, menú desplegable, popover, comando— pero **no alcanzan solos**: lo que falta es la capa de identidad que los vuelve de esta aplicación y no de una librería. El trabajo es esa capa, no reimplementar el manejo de foco.

### B. Los choques con lo ya decidido

**B1 — El detalle de tarea pasa a modal centrado.** `docs/product-spec.md` §3 especifica *"panel lateral redimensionable que recuerda el ancho, o pantalla completa en teléfono"*. El dueño pide modal por encima de la pantalla.

Se acepta el cambio y **se actualiza el spec**, que es la regla del proyecto: si el código y el spec no coinciden, gana el spec o se actualiza el spec de forma explícita. En teléfono sigue siendo pantalla completa, que ya estaba bien.

Consecuencia a tener en cuenta: el ancho del panel se guardaba en `localStorage` y eso deja de tener sentido. Un modal centrado no se redimensiona.

**B2 — El color personalizado convive con la paleta, no la reemplaza.** La decisión **D19** fijó paleta cerrada de diez colores con un motivo concreto: un color libre produce proyectos con contraste ilegible y rompe el modo oscuro. El dueño pide un selector de color personalizado al final de la lista.

Resolución: la **paleta con nombre sigue siendo el camino principal** y el que se ofrece primero; el color personalizado es una salida al final, y **valida contraste** contra los fondos de los dos temas, rechazando lo que no se lea. Así se gana la libertad sin reabrir el agujero que D19 cerró.

Consecuencia en el esquema: `projects.color` tiene hoy un check constraint que solo admite los diez identificadores. Aceptar color libre exige ampliarlo, y la función que resuelve el color a hexadecimal ya está centralizada —se hizo cuando el hex de la Bandeja causó un crash—, así que el punto de extensión existe.

**B3 — Adjuntar archivos no entra.** Aparece en la referencia visual del alta de tareas, pero `docs/product-spec.md` §13 lo pone fuera de alcance de forma permanente, en ninguna versión. No se implementa ni se muestra deshabilitado: un control que no hace nada es peor que su ausencia, que es el mismo criterio de **D7** con los recordatorios por email.

**B4 — Zona horaria por tarea no entra.** Aparece en la referencia del selector de hora. No existe en el modelo de datos y la zona es una preferencia de la cuenta. Agregarla sería una decisión de producto, no de interfaz.

**B5 — Recordatorios y etiquetas en el alta son fase 2.** La referencia visual los muestra. Los recordatorios no tienen tabla todavía; la administración de etiquetas es de fase 2. El componente de alta **se diseña con lugar para ellos** —que es distinto de mostrarlos vacíos—, para que sumarlos en la fase 2 no obligue a rehacerlo.

### C. El ancho

**C1 — Adaptativo, no fijo.** El ancho máximo de 768 píxeles resolvió que en pantallas anchas la metadata de una tarea quedara a mil doscientos píxeles de su título, y creó que en escritorio la app se vea con ancho de teléfono. Las dos cosas son ciertas: el problema real no es el ancho de la columna sino **la distancia entre el título y su metadata**.

La dirección es que el contenido crezca con la ventana hasta un tope bastante mayor que el actual, y que la metadata de una tarea **no se pegue al borde derecho** sino que acompañe al título. La skill `ui-ux-pro-max` define el tope y el comportamiento intermedio; lo que este design fija es que la solución no puede volver a ser un número fijo chico.

### D. El editor de descripción

**D1 — Las extensiones que hacen falta no están instaladas.** Hoy hay `starter-kit` y `link`. La barra pedida —títulos, tachado, resaltado, código— y el menú contextual —tablas, notas al pie, bloques de código, fórmula matemática— necesitan más.

`AGENTS.md` tiene lista cerrada de librerías y exige decisión explícita para agregar. Corresponde **registrar la decisión antes de instalar**, y acotar: las extensiones que cubren lo que el dueño pidió, no el catálogo completo.

**La fórmula matemática es la más cara**: requiere un motor de renderizado matemático, que es una dependencia grande para una función que en un gestor de tareas personal probablemente se use poco. Queda señalada como **decisión aparte**, separada del resto del editor, para poder aceptarla o rechazarla sin bloquear lo demás.

**D2 — La autodetección de markdown es de entrada, no de almacenamiento.** El contenido se sigue guardando como documento estructurado. Escribir `#` produce un título de verdad, no un carácter almacenado. Eso ya es cómo funciona el editor; lo que falta es exponer las reglas.

**D3 — El menú contextual reemplaza al del navegador, con criterio.** La referencia es de otra aplicación y trae cosas que no aplican: comentarios en el documento y bases de datos embebidas no existen en Trazio. Se toman las opciones de formato, párrafo e insertar, y las de portapapeles, incluido **pegar sin formato**, que es la que más se extraña.

### E. El orden de trabajo, que no es negociable

1. **Primitivas**: capas, diálogos, menús contextuales, selectores desplegables, confirmaciones.
2. **Ancho adaptativo**, que es barato y cambia la percepción de todo lo que se pruebe después.
3. **Selectores de atributos**: fecha, fecha límite, prioridad. Son los que consume el alta.
4. **El componente de alta**, que usa los selectores.
5. **El detalle como modal**, que usa el alta y los selectores.
6. **El editor de descripción**, que vive dentro del detalle.
7. **El modal de proyecto**, con emojis y color.
8. **La configuración como modal**.
9. **El panel lateral**.

Cada escalón usa el anterior. Empezar por el medio significa rehacer.

## Risks / Trade-offs

**Es más trabajo de interfaz que toda la fase 1.** → Se mitiga con el orden por dependencia y entregando por escalones verificables, no todo junto al final.

**Toca componentes que hoy funcionan.** → Los 317 tests y las pruebas de punta a punta son la red. Cualquier reemplazo tiene que dejarlos en verde, y donde no haya cobertura hay que agregarla antes de tocar.

**El selector de emojis con todos los emojis es pesado.** → Son miles de entradas con nombres y categorías. Cargarlo con la aplicación empeoraría el arranque; tiene que cargarse cuando se abre y no antes.

**El color personalizado reabre parcialmente lo que D19 cerró.** → La validación de contraste es lo que evita que sea un retroceso. Si esa validación se afloja, vuelve el problema entero.

**Riesgo de sobre-diseño.** → La referencia visual es de un producto maduro con años de iteración y un equipo. Copiar su densidad de opciones sin su recorrido produce interfaces recargadas. Cada control que se agregue tiene que ganarse el lugar.

## Migration Plan

No hay migración de datos salvo la ampliación del check constraint de color, si se acepta el color personalizado. El resto es reemplazo de interfaz sobre datos que no cambian.

Se despliega por escalones sobre previews. Cada escalón deja el gate en verde y las pruebas de punta a punta pasando.

## Decisiones resueltas

**OQ1 — La fórmula matemática queda afuera.** Es la única pieza del editor que traía una dependencia grande, para una función de uso marginal en un gestor de tareas personal. El resto del editor no depende de ella: títulos, negrita, cursiva, tachado, resaltado, código, listas, citas, tablas y notas al pie sí entran. Se suma si aparece la necesidad real.

**OQ2 — La fase 1 se archivó primero.** Sus doce capacidades pasaron a `openspec/specs/` como línea base, así que este cambio escribe deltas contra requisitos que existen en vez de redefinir capacidades en paralelo. Si se hubiera archivado después, se habrían promovido specs que este cambio ya reemplazó.

**OQ3 — La configuración muestra solo las secciones que funcionan.** Cuenta, General, Tema e Instalación. Notificaciones y Calendarios aparecen cuando tengan contenido real. Es el criterio de D7: una opción configurable que no hace nada es un bug de confianza, y mostrarla deshabilitada no lo arregla.

**OQ4 — Google se muestra y se desvincula, no se vincula.** La sección de cuenta indica si el acceso se hizo con Google y permite desconectarlo. No se implementa el flujo de agregarle acceso con Google a una cuenta creada con correo y contraseña: es un flujo nuevo con casos de borde propios —correo que no coincide, otra cuenta con ese correo— y no es lo que se pidió.
