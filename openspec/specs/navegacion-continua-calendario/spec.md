# navegacion-continua-calendario Specification

## Purpose
TBD - created by archiving change calendario-scroll-infinito. Update Purpose after archive.
## Requirements
### Requirement: El calendario se desplaza día por día, sin páginas

En los formatos de uno, cuatro y siete días, la vista de calendario SHALL desplazarse horizontalmente de forma continua, de a un día, y NUNCA SHALL saltar de un bloque fijo al siguiente.

El desplazamiento SHALL cubrir al menos un año hacia atrás y un año hacia adelante desde el día de hoy. Más allá de ese alcance, la vista SHALL poder llegarse eligiendo una fecha, y NUNCA SHALL exigirse recorrer el desplazamiento.

La cantidad de días visibles SHALL ser exactamente la del formato elegido, y las columnas SHALL repartirse el ancho disponible sin dejar una columna cortada al borde.

#### Scenario: Correrse un solo día

- **WHEN** el usuario desplaza la vista de semana hacia la derecha lo equivalente a un día
- **THEN** SHALL verse el día siguiente al último que se veía
- **AND** SHALL dejar de verse el primero que se veía
- **AND** los siete días visibles SHALL seguir repartiéndose todo el ancho

#### Scenario: La semana no se alinea a un día fijo

- **WHEN** el usuario, en formato semana, se corre tres días
- **THEN** SHALL verse un tramo de siete días corridos que empieza en un día cualquiera
- **AND** NUNCA SHALL reacomodarse sola la vista para que la semana empiece en el día configurado como inicio de semana

#### Scenario: El alcance del desplazamiento

- **WHEN** el usuario se desplaza hacia adelante desde hoy
- **THEN** SHALL poder llegar al menos hasta un año después de hoy

### Requirement: Volver a hoy y correr de a una pantalla

La vista SHALL ofrecer una acción para volver a hoy, que SHALL dejar el día de hoy como primera columna visible.

Las acciones de anterior y siguiente SHALL correr la vista la misma cantidad de días que hay visibles, y NUNCA SHALL cambiar la cantidad de días que se ven.

Al abrirse la pantalla, la vista SHALL empezar con hoy como primera columna, sin recordar dónde había quedado el desplazamiento.

#### Scenario: Volver a hoy

- **WHEN** el usuario está mirando una semana de dos meses después y usa la acción de volver a hoy
- **THEN** hoy SHALL quedar como primera columna visible

#### Scenario: Siguiente corre una pantalla

- **WHEN** el usuario en formato de cuatro días usa la acción de siguiente
- **THEN** la vista SHALL correrse cuatro días
- **AND** SHALL seguir mostrando cuatro días

#### Scenario: Al entrar se ve hoy

- **WHEN** el usuario se desplaza hasta otra semana, sale de la pantalla del calendario y vuelve a entrar
- **THEN** hoy SHALL estar como primera columna visible

### Requirement: Arrastrar contra el borde desplaza la vista

Mientras se arrastra un bloque, acercarlo al borde lateral de la vista SHALL desplazar el calendario en esa dirección, de modo que el bloque SHALL poder soltarse en un día que no estaba visible al empezar el gesto.

Mientras la vista se desplaza durante un arrastre, la sombra de destino SHALL seguir señalando el día y el horario en que el bloque quedaría, y NUNCA SHALL quedar apuntando al día que ocupaba esa posición antes de desplazarse.

#### Scenario: Mover algo del domingo al lunes

- **WHEN** el usuario arrastra un bloque del domingo, que es la última columna visible, hasta el borde derecho
- **THEN** la vista SHALL desplazarse para descubrir el lunes
- **AND** el bloque SHALL poder soltarse en el lunes
- **AND** al soltarlo SHALL quedar guardado en el lunes

#### Scenario: La sombra sigue al día correcto

- **WHEN** la vista se desplaza mientras el usuario arrastra un bloque
- **THEN** la sombra de destino SHALL corresponder al día sobre el que está el puntero después del desplazamiento

### Requirement: Los días se cargan antes de aparecer

Los datos de un día SHALL pedirse por tramos fijos que no dependan de dónde esté el desplazamiento, de manera que correrse un día NUNCA SHALL volver a pedir los días que ya estaban cargados.

La vista SHALL pedir por adelantado los días vecinos a los visibles, de modo que al desplazarse aparezcan ya con su contenido.

#### Scenario: Correrse no vuelve a pedir lo que ya estaba

- **WHEN** el usuario se corre un día dentro de un tramo ya cargado
- **THEN** NUNCA SHALL volver a pedirse el contenido de los días que ya se estaban viendo

#### Scenario: El día siguiente ya viene cargado

- **WHEN** el usuario se desplaza hacia un día vecino a los visibles
- **THEN** ese día SHALL aparecer con sus tareas, hábitos y eventos ya cargados

### Requirement: Solo se dibujan los días cercanos a lo visible

La vista SHALL mantener dibujadas únicamente las columnas visibles y un margen a cada lado, y la cantidad de columnas dibujadas NUNCA SHALL crecer a medida que el usuario recorre el calendario.

Las columnas del margen SHALL seguir dibujadas durante un arrastre, para que puedan recibir un bloque apenas asoman.

#### Scenario: Recorrer no acumula columnas

- **WHEN** el usuario se desplaza a lo largo de varios meses
- **THEN** la cantidad de columnas dibujadas SHALL mantenerse acotada

#### Scenario: La columna que asoma puede recibir el bloque

- **WHEN** durante un arrastre la vista se desplaza y asoma una columna nueva
- **THEN** esa columna SHALL poder recibir el bloque que se está arrastrando

