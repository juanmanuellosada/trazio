## MODIFIED Requirements

### Requirement: Creación implícita de etiquetas desde el alta rápida

Al escribir `@` seguido de texto en el alta rápida, el parser SHALL reconocer un
candidato de etiqueta hasta el primer espacio o símbolo. Al confirmar la tarea, el
sistema SHALL comparar ese texto contra las etiquetas existentes del usuario sin
distinguir mayúsculas ni acentos. Si hay una coincidencia, SHALL asignarse la
etiqueta existente. Si no hay ninguna, SHALL crearse una etiqueta nueva con ese
nombre y asignarse a la tarea. Esta no es la única forma de crear una etiqueta:
también puede crearse explícitamente desde la pantalla de administración, según
define `administracion-de-etiquetas`.

#### Scenario: Escribir un nombre existente reutiliza la etiqueta

- **WHEN** el usuario ya tiene una etiqueta llamada `Compras` y escribe `Comprar leche @compras` en el alta rápida
- **THEN** la tarea se guarda con la etiqueta `Compras` existente
- **AND** no se crea una segunda etiqueta

#### Scenario: Un nombre con acentos o mayúsculas distintos sigue siendo la misma etiqueta

- **WHEN** el usuario ya tiene una etiqueta llamada `Café` y escribe `@cafe` o `@CAFÉ` en el alta rápida
- **THEN** se asigna la etiqueta `Café` existente
- **AND** no se crea una etiqueta nueva

#### Scenario: Escribir un nombre sin coincidencia crea la etiqueta

- **WHEN** el usuario no tiene ninguna etiqueta que coincida (sin distinguir mayúsculas ni acentos) con el texto que sigue al `@`
- **THEN** se crea una etiqueta nueva con ese nombre para el usuario
- **AND** la etiqueta nueva se asigna a la tarea recién creada

#### Scenario: Varias etiquetas en la misma alta rápida se crean o reutilizan todas

- **WHEN** el usuario escribe `Comprar regalo @compras @urgente` y ya tiene una etiqueta `compras` pero no `urgente`
- **THEN** la tarea queda asignada a la etiqueta `compras` existente y a una etiqueta `urgente` recién creada

### Requirement: Fuera de alcance en fase 1

La página propia por etiqueta, marcar una etiqueta como favorita y el acceso "Etiquetas" del panel lateral que llevaría a esa página propia MUST NOT implementarse todavía: siguen en fase 2, según ya fijaba el roadmap.
La página de administración de etiquetas deja de estar fuera de alcance: la
incorpora la capacidad `administracion-de-etiquetas`, que permite crear,
renombrar, recolorear y eliminar etiquetas desde una pantalla propia, además de
la creación implícita que ya existía desde el alta rápida.
Sigue alcanzando con asignar y quitar etiquetas desde el detalle de una tarea y
mostrar su chip, sin construir todavía la navegación por etiqueta individual ni
el marcado de favoritas: son justamente lo que queda para la fase 2.

#### Scenario: No existe una página propia por etiqueta ni el acceso del panel lateral

- **WHEN** se revisa el panel lateral y las rutas de la aplicación en fase 1
- **THEN** no existe un ítem "Etiquetas" en el panel lateral
- **AND** no existe una ruta que muestre todas las tareas de una etiqueta particular

#### Scenario: is_favorite existe en la columna pero no en la interfaz

- **WHEN** se revisa la interfaz de fase 1
- **THEN** no hay ningún control para marcar una etiqueta como favorita, aunque la columna `is_favorite` ya exista en `labels`
