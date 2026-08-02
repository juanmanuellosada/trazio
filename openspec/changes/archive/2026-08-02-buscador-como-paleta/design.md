## Context

El buscador es una ruta con su propia pantalla: encabezado, campo y resultados como filas de
tarea. Busca con retardo mientras se escribe y tiene cuatro estados. Se llega por el ítem del
panel lateral o por el atajo `S`, que hace una navegación.

No hay navegación por teclado en los resultados.

La librería de paleta de comandos está instalada y se usa en cuatro desplegables con
búsqueda. Da gratis el filtrado, las flechas, el Enter, los grupos y el estado vacío.

Restricciones: los siete requisitos del buscador son de comportamiento de búsqueda y ninguno
fija que sea una pantalla.

## Goals / Non-Goals

**Goals:**

- Buscar sin perder la vista en la que estás.
- Navegar los resultados con el teclado.
- Volver a lo último visto sin escribir nada.

**Non-Goals:**

- Cambiar el comportamiento de búsqueda.
- Comandos que no sean navegar ni abrir una tarea.
- Buscar proyectos, etiquetas o comentarios.

## Decisions

### D-A. Paleta sobre la vista, y la ruta se queda

La paleta se abre por encima de lo que estás mirando. Es el punto de todo: hoy `S` te saca de
la vista.

**La ruta `/buscar` no se elimina.** Es un destino válido, puede estar en un historial o en un
favorito, y sacarla rompería eso sin necesidad. Qué hace cuando alguien entra directo —quedar
como está, o abrir la paleta sobre la vista por defecto— se decide al implementar.

### D-B. Tres grupos, y el orden importa

| Grupo | Cuándo aparece |
| --- | --- |
| Visto recientemente | Con el campo vacío |
| Resultados | Al escribir, desde el mínimo de caracteres que ya rige |
| Ir a | Siempre |

Con el campo vacío la paleta no puede estar en blanco: ahí es donde entran los recientes y los
destinos. Es lo que la vuelve útil incluso sin buscar nada.

**El mínimo de caracteres sigue rigiendo para los resultados**, no para los otros dos grupos:
"Ir a Hoy" tiene que poder filtrarse con una letra.

### D-C. Los recientes son lo único que hay que inventar

Todo lo demás existe. Hay que decidir dos cosas: **qué cuenta como visto** —abrir el detalle
parece lo obvio— y **dónde se guarda**.

Guardarlo en el navegador es lo más simple y no ensucia la base con algo que no es del
dominio. Tiene el costo de que no se comparte entre dispositivos, lo cual para "lo último que
miré" es incluso lo correcto: lo último que miré en la computadora no es lo último que miré en
el teléfono.

**Ojo con una trampa**: si una tarea reciente se borra, no puede quedar como un ítem que al
tocarlo no hace nada.

### D-D. Los atajos que se muestran son los reales

Los destinos de navegación ya tienen sus indicadores de atajo en el panel lateral, y esos
indicadores **se alimentan del binding real** — es una decisión escrita, para que un indicador
no pueda mentir. La paleta usa lo mismo, no una lista escrita a mano.

### D-E. "Abrir completo en esta ventana" es un ítem, no un rediseño

El menú del detalle ya tiene "abrir en ventana aparte", que abre otra ventana sobre la ruta de
la tarea suelta. El ítem nuevo va a la misma ruta **sin** abrir ventana.

Los dos se quedan: son cosas distintas y las dos se usan.

## Risks / Trade-offs

**Un modal que reemplaza una pantalla puede perder estados** → La pantalla de hoy tiene cuatro
estados con textos propios, incluidos dos distintos según se haya escrito cero o un carácter.
Es fácil perderlos al pasar a la paleta y quedarse con un vacío genérico.

**La paleta compite con los atajos de la aplicación** → Con la paleta abierta, las teclas
tienen que ir al campo, no a los atajos globales. El sistema de atajos tiene una guarda para
campos de texto, pero conviene comprobarlo: escribir "hoy" en la paleta no puede navegar a
Hoy.

**Los recientes pueden apuntar a algo borrado** → D-C.

**El indicador de atajo puede mentir** → Ya pasó una vez en este proyecto: se mostraba una
tecla que en esa pantalla no hacía nada. Por eso D-D exige alimentarlos del binding real.

## Open Questions

- Qué hace la ruta `/buscar` cuando alguien entra directo. Se decide al implementar.
