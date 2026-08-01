## Context

Las cuatro fases del roadmap están en producción. Esta es la tercera ronda de
refinamiento visual, después de `interfaz-propia` —que sacó todo elemento nativo
del navegador— e `interfaz-refinada`, que atacó fricciones de uso. Las dos
nacieron igual: el dueño usó la aplicación y trajo lo que le molestaba.

Lo que aparece ahora es de otra naturaleza. No es que algo funcione mal: es que
**funcionalidad construida y probada resulta invisible**. El sistema de atajos de
la fase 2 tiene su acorde, su pila de contextos y sus colisiones resueltas, y
nadie que no haya leído el spec sabe que existe.

La referencia es Todoist en español, que es de donde viene el público del producto
— el mismo argumento que ya fijó **D32** al invertir los símbolos del parser.

Restricciones que condicionan: **D4** (solo español), **D5** (el rojo de marca no
se usa para destructivos genéricos), **D24** (ninguna acción disponible solo por un
gesto), **D28** (el detalle es modal centrado), **D33** (las prioridades se nombran
`P<n> · Nombre`).

## Goals / Non-Goals

**Goals:**

- Que los atajos existan para quien no leyó documentación.
- Una cabecera con el título y nada más.
- Que el panel de opciones sea usable en 390px, donde la barra plana ya se
  envolvía.
- Que un indicador de atajo nunca mienta.

**Non-Goals:**

- Atajos nuevos. Solo se localizan dos letras.
- Cambiar qué opciones existen o cómo se persisten. `view_preferences` no se toca.
- Una pantalla de ayuda con la lista completa de atajos. Puede tener sentido
  después; no es lo que resuelve el problema de hoy.
- Rediseñar el panel lateral más allá de sumarle los indicadores.

## Decisions

### D-A. Un solo disparador, tres secciones

El panel se abre desde un único control en la cabecera y agrupa:

| Sección | Qué contiene |
| --- | --- |
| **Vista** | Lista, panel, calendario. El formato de calendario aparece solo cuando la forma de ver es calendario. Los interruptores de completadas y de hábitos |
| **Orden** | Agrupar por, ordenar por |
| **Filtro** | Fecha límite, prioridad, etiqueta |

Y el botón de restablecer, abajo.

**El selector de forma de ver también va adentro.** Es la decisión del dueño y
tiene un costo real que conviene tener escrito: cambiar de lista a calendario pasa
de un clic a dos. Se acepta porque la cabecera limpia vale más que el clic
ahorrado, y porque la forma de ver se cambia mucho menos seguido de lo que su
prominencia actual sugiere.

*Alternativa descartada:* dejar los tres íconos de forma de ver afuera y el resto
adentro. Es un intermedio defendible, pero deja la cabecera a mitad de camino y no
resuelve el problema en el teléfono, que es donde más molesta.

El disparador tiene que mostrar cuándo hay opciones activas que no son las por
defecto, o el panel esconde estado y el usuario no sabe por qué su lista se ve
distinta. Ese es el riesgo real de agrupar, y hay que compensarlo.

### D-B. Un componente para el indicador, usado en todos lados

Un solo componente dibuja la tecla. No se repite la marca en cada lugar que lo
necesite: si el estilo cambia, cambia en uno.

Recibe la representación de un atajo y la dibuja. Los acordes se muestran como dos
teclas —`G` y `H`—, no como una cadena `"G H"`, porque son dos pulsaciones y la
forma tiene que decirlo.

**No se muestran por debajo del punto de corte de teléfono.** Un indicador de
teclado en una pantalla táctil ocupa espacio y no sirve para nada. Es una regla de
presentación, no de disponibilidad: el atajo sigue existiendo si hay teclado
conectado.

### D-C. La fuente de verdad del atajo es una sola

El riesgo grande de esta tanda es que el indicador y el atajo se desincronicen: la
pantalla dice `G T` y el sistema escucha `G H`. Un indicador que miente es peor que
no tener indicador — enseña algo falso y erosiona la confianza en todos los demás.

Para evitarlo, **el indicador se alimenta de la misma definición que registra el
atajo**, no de una cadena escrita a mano en el componente. `lib/shortcuts/` ya
tiene el mapa del acorde y el registro de bindings: el indicador lee de ahí.

Donde eso no sea posible sin una refactorización grande, se acepta la cadena
literal **con un test que verifique que coincide con el binding real**. La
verificación no es opcional: es lo que hace que la decisión sea segura.

### D-D. `G T` y `G U` se localizan; el resto no se toca

| Antes | Ahora | Por qué |
| --- | --- | --- |
| `G T` | **`G H`** | `T` era de *Today*. `H` es de Hoy |
| `G U` | **`G P`** | `U` era de *Upcoming*. `P` es de Próximos |
| `G I` | `G I` | Bandeja. Ya funcionaba |
| `G C` | `G C` | Completado. Ya funcionaba |
| `G A` | `G A` | Hábitos. Ya funcionaba |

Verificado que ni `H` ni `P` colisionan con ningún binding existente.

Esto rompe la memoria muscular de quien ya usaba los viejos, que hoy es una
persona. Cuanto antes se haga, más barato sale.

*Alternativa descartada:* dejarlos en inglés por respetar el spec al pie de la
letra. El spec se escribió cuando los atajos eran invisibles; mostrarlos cambia el
criterio, y actualizarlo es justamente lo que corresponde en vez de arrastrar una
incoherencia porque quedó escrita.

### D-E. El ícono del título se saca sin extraer un encabezado compartido

Hoy cada vista dibuja su propio encabezado: `proximos-view.tsx`,
`completed-view.tsx`, `sectioned-tasks.tsx` y `project-header.tsx`. No hay
componente común.

Se saca el ícono en los cuatro, **sin extraer una abstracción**. Los encabezados no
son iguales entre sí —el de proyecto tiene favorito y menú de acciones, el de
Próximos tiene su ventana de días— y unificarlos para compartir un título y un
espacio produciría un componente con cinco banderas. Cuando haya una quinta vista
con el mismo encabezado, se extrae.

## Risks / Trade-offs

**Agrupar esconde estado** → Si alguien deja un filtro activo y cierra el panel,
la lista se ve distinta sin explicación visible. El disparador tiene que indicar
que hay opciones activas, y eso hay que verificarlo a mano: es exactamente lo que
un test no ve.

**Un indicador que miente** → D-C lo ataca de raíz alimentándolo del binding real.
Donde eso no se pueda, el test que compara la cadena con el binding es obligatorio.

**Cambiar dos atajos rompe memoria muscular** → Afecta a una persona y se hace
ahora, que es cuando menos cuesta.

**Dos clics para cambiar de vista** → Costo aceptado de D-A. Si al usarlo molesta
más de lo previsto, la salida es sacar los tres íconos afuera, que es la
alternativa que ya está descartada por escrito y sería fácil de retomar.

**El gate en verde no prueba nada** → En la fase 4 la grilla estuvo construida y
sin montar sin que nadie lo notara. Esta tanda es enteramente visual: se verifica
en el navegador, en escritorio y en 390px, o no se verifica.

## Open Questions

- El spec no dice si el disparador del panel lleva atajo propio. No se le asigna
  uno: agregar atajos está fuera de alcance, y si se ve necesario al usarlo, es un
  cambio de una línea después.
- Queda sin resolver si conviene una pantalla de ayuda con todos los atajos. Los
  indicadores cubren los que están a la vista; los del detalle de tarea y los del
  menú contextual se descubren al abrir esas superficies. Si eso no alcanza, la
  pantalla de ayuda es el paso siguiente natural.
