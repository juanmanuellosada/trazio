## Context

`lib/tasks/duplicate.ts` expone `duplicateTaskTree(supabase, rootId, rootPosition)`.
Recorre el subárbol en anchura e inserta de a un nodo, porque necesita el `id`
nuevo del padre antes de insertar sus hijos — Postgres no garantiza el orden de
un `insert(...).select()` de varias filas. Esa decisión ya está tomada y
probada; se reusa tal cual.

El menú del proyecto vive en `components/projects/project-header.tsx`, que ya
no lo renderiza para la Bandeja de entrada (no se puede editar, archivar ni
eliminar).

## Goals / Non-Goals

**Goals:** copiar un proyecto entero reusando la copia de tareas que ya
funciona.

**Non-Goals:** plantillas con fechas relativas, duplicar subproyectos, galería
de plantillas, y duplicar la Bandeja de entrada (no se puede ni borrar).

## Decisions

### D-A — Duplicar es duplicar; plantilla es otra cosa

La copia lleva las fechas tal cual. Es tentador limpiarlas —"para eso se
duplica"— pero eso convierte la función en una plantilla, y una plantilla tiene
preguntas propias: ¿las fechas se limpian o se corren?, ¿relativas a qué?

Duplicar tiene una definición obvia y verificable: queda igual. Si después se
quiere una plantilla, se construye encima con esa pregunta ya respondida.

### D-B — Lo que no se copia, y por qué cada cosa

| Qué | Se copia | Por qué |
| --- | --- | --- |
| Tareas pendientes, con subtareas | Sí | Es el objeto del ejercicio |
| Etiquetas de cada tarea | Sí | Son parte de la tarea |
| Secciones, con su descripción | Sí | La estructura es lo que se repite |
| Tareas **completadas** | No | Copiarlas nacería un proyecto con trabajo ya hecho que nadie hizo |
| Comentarios | No | Son una conversación sobre *esa* instancia |
| Recordatorios | No | Son instantes absolutos; duplicarlos dispara avisos duplicados |
| Favorito / archivado | No | Son estado de uso, no contenido |

Los recordatorios son el caso donde copiar haría daño real: dos avisos para el
mismo momento, uno de una tarea que la persona no sabe que existe.

### D-C — No arrastra los subproyectos

Un proyecto puede tener hijos hasta tres niveles. Duplicar solo el proyecto
elegido es lo predecible: quien duplica "Mudanza" espera una copia de Mudanza,
no de su árbol entero, que puede ser grande y del que no vio el tamaño.

Si hace falta, se duplica cada uno. Queda escrito para que sea una decisión y
no un descuido.

### D-D — Se abre al terminar

Duplicar un proyecto de treinta tareas tarda: `duplicateTaskTree` inserta nodo
por nodo, y acá se llama una vez por tarea raíz. Sin abrir la copia al final,
la persona no tiene forma de saber si pasó algo. Abrirla es la confirmación.

Mientras tanto, la acción tiene que mostrar que está trabajando: es de las
pocas de Trazio que no puede ser optimista, porque los ids nuevos los asigna
el servidor.

## Risks / Trade-offs

**[Un proyecto grande tarda]** → D-D: indicador de progreso y apertura al
final. Si en uso resulta lento de más, la salida es una función SQL que copie
del lado del servidor, no cambiar el criterio de qué se copia.

**[Una copia a medias si falla en el medio]** → El bucle inserta de a una
tarea; si falla la número veinte, quedan diecinueve. Decidir si se limpia lo
insertado o se deja el proyecto a medias con un aviso. Lo segundo es más
simple y el proyecto se puede borrar, que es una acción que ya existe.
