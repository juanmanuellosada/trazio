## MODIFIED Requirements

### Requirement: Acceso "Etiquetas" en el panel lateral

El panel lateral SHALL mostrar un acceso "Etiquetas" entre los accesos principales,
inmediatamente debajo de Próximos, que navega a la pantalla de administración de
etiquetas (`/etiquetas`). Ese acceso SHALL mostrarse siempre, tenga el usuario
etiquetas o no. El panel lateral MUST NOT mostrar además una lista plegable con las
etiquetas no favoritas: las etiquetas se recorren desde su pantalla, y las de uso
frecuente desde la sección Favoritos. Este acceso estaba explícitamente prohibido en
fase 1, pasó a existir en fase 2 como lista plegable, y pasa a ser un acceso principal
con destino propio y sin lista.

#### Scenario: El acceso se muestra aunque el usuario no tenga ninguna etiqueta

- **WHEN** el usuario no tiene ninguna etiqueta creada
- **THEN** el panel lateral SHALL mostrar igualmente el acceso "Etiquetas"
- **AND** hacer clic en él navega a `/etiquetas`, donde puede crear la primera

#### Scenario: Hacer clic en "Etiquetas" lleva a la administración

- **WHEN** el usuario hace clic en el acceso "Etiquetas" del panel lateral
- **THEN** la aplicación navega a `/etiquetas`
- **AND** desde ahí puede crear, renombrar, recolorear y eliminar sus etiquetas

#### Scenario: Las etiquetas no favoritas no se listan en el panel lateral

- **WHEN** el usuario tiene las etiquetas `Compras` (favorita) y `Lectura`
  (no favorita)
- **THEN** el panel lateral NUNCA SHALL listar `Lectura` bajo el acceso "Etiquetas"
- **AND** `Compras` SHALL seguir mostrándose en la sección Favoritos

#### Scenario: Se llega a la página de una etiqueta no favorita desde su pantalla

- **WHEN** el usuario entra a `/etiquetas` y hace clic en `Lectura`
- **THEN** la aplicación navega a `/etiquetas/<id>` de `Lectura`

#### Scenario: La lista plegable de filtros no se ve afectada

- **WHEN** el usuario mira el panel lateral
- **THEN** la lista plegable de filtros guardados SHALL seguir mostrándose como hasta
  ahora
