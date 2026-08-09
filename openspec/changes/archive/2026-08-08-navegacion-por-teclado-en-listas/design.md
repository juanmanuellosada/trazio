## Context

El sistema de atajos ya está bien puesto y no hay que rehacerlo:

- `lib/shortcuts/context.ts` mantiene una **pila de contextos**; el último
  empujado gana ante una colisión. `useShortcutScope` la usa desde cualquier
  componente y degrada en silencio sin provider.
- `lib/shortcuts/guards.ts` bloquea las teclas sueltas cuando el foco está en
  un campo de texto, y deja pasar las que llevan `Ctrl`/`Cmd`.
- `lib/selection/reducer.ts` ya es un reducer puro con `active`, `selected` y
  **`anchorId`** — el ancla del último clic simple, que existe para calcular
  el rango de `⇧`clic.

Lo que no existe es la noción de "fila señalada". La lista no es plana: hay
grupos (por sección, fecha, prioridad o etiqueta), secciones colapsables y
subtareas anidadas sin límite de niveles. Y cambia sola: realtime puede
insertar, mover o borrar una fila mientras la persona está parada encima.

Las listas **no** están virtualizadas, lo que simplifica bastante: cada fila
tiene un nodo real en el DOM y se le puede dar foco.

## Goals / Non-Goals

**Goals:**

- Recorrer y operar una lista sin mouse.
- Que el cursor sea foco real del navegador, no un resaltado pintado.
- Reusar la selección múltiple y los atajos del menú contextual, sin
  duplicar ni uno.
- Un reducer puro, testeable sin DOM, como el de selección.

**Non-Goals:**

- Panel y calendario. Una grilla de dos ejes con bloques superpuestos es un
  problema propio (decisión del dueño: solo lista).
- Reordenar con el teclado. El arrastre ya cubre eso y mezclarlo con el
  cursor duplicaría el significado de `↑`/`↓`.
- Un atajo nuevo por atributo sobre la fila señalada. Ver D-D.
- Teléfono.

## Decisions

### D-A — Roving tabindex, no `aria-activedescendant`

El contenedor de lista es `role="listbox"`, cada fila `role="option"`. La
fila señalada lleva `tabIndex={0}`, el resto `tabIndex={-1}`, y moverse
llama a `.focus()` real sobre el nodo de la fila.

**Alternativa considerada:** `aria-activedescendant` — el foco se queda en el
contenedor y un atributo apunta a la fila activa. Es menos código y evita
mover el foco.

**Por qué roving:** con `activedescendant` el foco del navegador nunca está
en la fila, así que todo lo que ya funciona por foco —el anillo de foco,
`:focus-visible`, `scrollIntoView` automático del navegador, el orden de
tabulación, los menús de Radix que se anclan al elemento enfocado— hay que
reimplementarlo a mano. El soporte de `activedescendant` en lectores de
pantalla además es históricamente más desparejo que el de foco real. Roving
tabindex cuesta un `ref` por fila y devuelve todo eso gratis.

**Consecuencia:** `Tab` entra a la lista en la fila señalada y sale de la
lista de una, en vez de tabular fila por fila. Es el comportamiento correcto
de un `listbox` y además es el que la gente espera.

### D-B — El cursor recorre la lista aplanada tal como se ve

El reducer no conoce la estructura: recibe `orderedIds`, la lista aplanada en
el orden visible, exactamente igual que `lib/selection/reducer.ts` ya recibe
`orderedIds` para calcular un rango con `⇧`clic. Esa lista la arma la
pantalla, que es la única que sabe cómo quedó agrupada, ordenada y qué está
colapsado.

Consecuencias, todas deseables y todas gratis:

- Una sección colapsada no aporta ids: el cursor la saltea entera.
- Una subtarea plegada tampoco.
- Agrupar por prioridad cambia el orden del recorrido sin tocar el reducer.
- Los encabezados de grupo **no** entran: son texto, no filas accionables.

### D-C — Cuando la lista cambia debajo, el cursor se agarra de la posición

Realtime, un filtro, completar una tarea que sale de la vista: la fila
señalada puede desaparecer. La regla:

1. Si el id señalado sigue en `orderedIds`, el cursor no se mueve. Esto es lo
   que importa: reordenar la lista no arrastra el cursor a otro lado.
2. Si desapareció, el cursor va al id que ahora ocupa **esa misma posición**;
   si la lista se acortó, al último.
3. Si la lista quedó vacía, no hay cursor.

**Alternativa descartada:** limpiar el cursor cuando el id desaparece. Es lo
más simple, pero rompe el flujo central de la aplicación: completar una tarea
en Hoy la saca de la lista, y perder el cursor ahí obliga a volver al mouse
justo en la acción más frecuente que hay. Con la regla de posición, completar
varias seguidas con `Espacio` funciona sin tocar nada más.

### D-D — `.` abre el menú de la fila, y ahí termina el trabajo

La tentación es mapear los atajos del menú contextual (`T` fecha, `Y`
prioridad, `V` mover, `⇧Supr` eliminar) directo sobre la fila señalada. Se
descarta, y no por prudencia: son ocho teclas sueltas más en el contexto de
lista, colisionando con los atajos generales de una tecla (`S`, `Q`, `E`) y
obligando a inventar reglas de precedencia que hoy no hacen falta.

`.` abre el menú de acciones sobre la fila señalada, y el contexto del menú
—que ya existe y ya se empuja a la pila— trae sus atajos con él. Una tecla
nueva en vez de ocho, cero colisiones nuevas, y la persona ve las opciones en
lugar de tener que recordarlas.

`⇧F10` y la tecla Menú hacen lo mismo: son la convención del sistema para
"menú contextual del elemento enfocado", y con foco real (D-A) el navegador
ya las entrega en la fila.

### D-E — La selección por teclado reusa el ancla que ya existe

`⇧↓` es exactamente `⇧`clic sobre la fila de abajo. El reducer de selección
ya tiene `anchorId` y la acción `range`: el cursor le pasa el id nuevo y la
lista ordenada, y sale el mismo rango.

`X` es `toggle` sobre la fila señalada — el mismo que el casillero.

No se agrega estado de selección nuevo, y la barra de acciones en lote
aparece sola porque ya reacciona a `active`.

### D-F — La guarda de foco no alcanza, y hay que ampliarla con cuidado

`isBlockedByFocusGuard` bloquea las teclas sueltas cuando el foco está en un
`input`, `textarea` o `contenteditable`. Con el cursor, el foco pasa a estar
en una fila, que no es ninguna de esas — así que `Espacio`, `X` y `.` se
disparan bien.

Los dos casos que hay que mirar:

- **El alta rápida en línea** ("agregar tarea debajo") monta un input dentro
  de la lista. Ahí `Espacio` tiene que escribir un espacio, no completar la
  tarea de arriba. La guarda ya lo cubre porque es un `input` de verdad; hay
  que verificarlo con un test, no darlo por hecho.
- **`Espacio` es la tecla de scroll del navegador.** Con foco en una fila hay
  que llamar a `preventDefault()`, o completar una tarea también baja la
  página. Es el bug clásico de esta función.

### D-G — Un cursor por pantalla, y no sobrevive a la navegación

El estado del cursor vive en la pantalla, junto al de selección, y se pierde
al salir. No se guarda en `view_preferences` ni en la URL: "dónde estaba
parado" no es una preferencia, y restaurarlo al volver a una lista que
cambió sería adivinar.

Al entrar a una lista **no hay cursor** hasta que se presiona `↓`, `↑` o se
hace clic en una fila. Que aparezca solo al llegar implicaría que la primera
fila está señalada cuando nadie la señaló, y `Espacio` la completaría.

## Risks / Trade-offs

**[El cursor se confunde con la selección múltiple]** → Son dos estados
visuales distintos sobre la misma fila y pueden solaparse. Mitigación: el
cursor usa el anillo de foco del sistema de componentes, la selección usa
fondo y casillero. Definir el tratamiento con la skill `ui-ux-pro-max` antes
de escribirlo, y verificar el caso de una fila señalada **y** seleccionada,
que es donde se nota si están mal resueltos.

**[`Espacio` hace scroll]** → D-F: `preventDefault()`, con test.

**[Mover el foco pelea con Radix]** → Los menús y diálogos de Radix devuelven
el foco al cerrarse. Si el menú se abrió con `.` sobre la fila señalada, el
foco vuelve a esa fila, que es lo correcto. Verificar el caso de un menú que
elimina la fila: el foco vuelve a un nodo que ya no existe, y ahí manda la
regla de posición de D-C.

**[La lista aplanada hay que armarla en seis pantallas]** → Cada vista arma
hoy su propia estructura de grupos. Mitigación: exponer el aplanado como una
función compartida que reciba los grupos ya resueltos, y hacer que la primera
pantalla la estrene; si al llegar a la tercera la firma no alcanzó, corregirla
ahí y no antes.

**[Un lector de pantalla anuncia mal la lista]** → `listbox`/`option` es
correcto para "una lista de cosas seleccionables", pero cada fila tiene
adentro un casillero, un menú y controles. Verificar con un lector real, no
solo con los roles puestos; si `listbox` resulta hostil, la alternativa es
`grid`, que es lo que usan las listas ricas.

## Migration Plan

Pantalla por pantalla, empezando por Proyecto (la más simple: una sola
agrupación, sin eventos ni hábitos intercalados) y terminando por Hoy (la más
compleja: eventos, hábitos y atrasadas en la misma secuencia). El cursor
degrada solo: una pantalla que todavía no lo cablea funciona igual que hoy.
