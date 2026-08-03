## Why

Una fila de tarea es hoy **una sola línea**: casilla, título, y pegados al título los chips
de etiqueta y la fecha. Todo comprimido en una franja, mientras entre 260 y 810 píxeles de la
fila quedan sin usar según la tarea — en la Bandeja típica, con títulos cortos y sin fecha,
más de setecientos.

El dueño lo pidió así: *"podrías hacer más ancha cada tarea para mostrar más información y
mostrada mejor distribuida"*, y al aclararlo: *"de ancho no, expandir para abajo me refería.
Así tenés más lugar. Y que el proyecto se muestre alineado al título de la tarea pero todo a
la derecha, y abajo la fecha y las etiquetas."* Más: *"que cada tarea tenga una línea de
separación"* y que la de las secciones *"se destaque un poco más"*.

Hay dos cosas que hoy no se muestran y sí importan: **de qué proyecto y de qué sección es la
tarea**. En Hoy, en Próximos, en una etiqueta, en un filtro y en el buscador las tareas vienen
de lados distintos y no hay forma de saber de dónde salió cada una.

## What Changes

**La fila crece hacia abajo**

```
[ ] Título de la tarea                    Proyecto / Sección
    lunes   urgente   casa
```

- Arriba, el título con el **proyecto y la sección anclados a la derecha**.
- Abajo, la fecha y las etiquetas.
- **Cada línea desaparece si no tiene nada.** Una tarea sin fecha ni etiquetas sigue siendo
  una sola línea, como hoy.

**El proyecto solo donde aporta**

- Se muestra en Hoy, Próximos, Etiqueta, Filtro, Buscador y Completado, que cruzan proyectos.
- **No** en Bandeja, en un Proyecto, dentro de una sección ni en las subtareas del detalle:
  ahí repetiría en cada renglón lo que ya dice el encabezado.
- Se decide **por pantalla, explícitamente**. No se deriva de la variante del componente: eso
  fallaría en el tablero de un proyecto y al agrupar por prioridad.

**Líneas de separación, con dos pesos**

- Una línea tenue entre tareas hermanas.
- La de sección se destaca más, para que la jerarquía se lea.
- **Las subtareas no llevan línea**, y **la última tarea tampoco**: una línea al final, encima
  de "Agregar tarea", no separa nada.

**BREAKING** de contrato: el spec dice hoy que la metadata **nunca** se pega al borde derecho.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `vistas-lista`: la fila de tarea pasa a organizarse en niveles, con el proyecto y la sección
  anclados a la derecha y la fecha y las etiquetas debajo; y se acota el requisito que prohibía
  pegar metadata al borde derecho.

## Impact

**Datos.** El nombre del proyecto **ya está en memoria** y no cuesta una consulta. El de la
sección **no**: hoy solo se consultan de a un proyecto por vez, y para mostrarlas en pantallas
que cruzan proyectos hace falta **una consulta nueva de todas las secciones del usuario** —
una, mayorista y cacheada, nunca de a una por proyecto, que es el patrón que las reglas del
proyecto prohíben.

**Código.** Todo el cambio visual vive en `components/tasks/task-row.tsx`. Cada una de las
nueve superficies donde se monta tiene que decir si muestra el proyecto.

**Lo que hay que cuidar y no es obvio.** El botón del título toma su nombre accesible de todo
lo que contiene. Si el chip de proyecto va adentro, "Pagar el alquiler" pasa a llamarse
"Pagar el alquiler Trabajo" y **siete pruebas que buscan tareas por su nombre se rompen**. Va
al lado, con la misma geometría.

**Documentación.** La sección 5.1 de `docs/design-system.md` describe el layout de la fila y
su tope de ancho, y quedaría desactualizada. Es además el único lugar donde eso está escrito.

**Fuera de alcance.** **La descripción en la fila**: no se pidió, y no está en la consulta de
las listas a propósito —es un documento estructurado y pesado—, así que mostrarla sería un
cambio de datos y no de disposición. El tablero, donde la columna mide 288px y el título unos
130: ahí la fila sigue como está.
