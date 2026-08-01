## MODIFIED Requirements

### Requirement: Acceso "Etiquetas" en el panel lateral

El panel lateral SHALL mostrar un acceso "Etiquetas" entre los accesos principales,
inmediatamente debajo de Próximos, que navega a la pantalla de administración de
etiquetas (`/etiquetas`). Ese acceso SHALL mostrarse siempre, tenga el usuario
etiquetas o no. Del acceso SHALL colgar la lista colapsable de las etiquetas del
usuario que no están marcadas como favoritas, cada una enlazando a su propia página.
Este acceso estaba explícitamente prohibido en fase 1, pasó a existir en fase 2 como
lista colapsable, y pasa a ser un acceso principal con destino propio.

#### Scenario: El acceso se muestra aunque el usuario no tenga ninguna etiqueta

- **WHEN** el usuario no tiene ninguna etiqueta creada
- **THEN** el panel lateral SHALL mostrar igualmente el acceso "Etiquetas"
- **AND** hacer clic en él navega a `/etiquetas`, donde puede crear la primera

#### Scenario: El acceso se muestra aunque todas las etiquetas sean favoritas

- **WHEN** todas las etiquetas del usuario tienen `is_favorite` en `true`
- **THEN** el panel lateral SHALL mostrar igualmente el acceso "Etiquetas"
- **AND** la lista colapsable no lista ninguna, porque todas se muestran en Favoritos

#### Scenario: Hacer clic en "Etiquetas" lleva a la administración

- **WHEN** el usuario hace clic en el acceso "Etiquetas" del panel lateral
- **THEN** la aplicación navega a `/etiquetas`
- **AND** desde ahí puede crear, renombrar, recolorear y eliminar sus etiquetas

#### Scenario: Las etiquetas no favoritas aparecen en la lista colapsable

- **WHEN** el usuario tiene las etiquetas `Compras` (favorita) y `Lectura`
  (no favorita)
- **THEN** el panel lateral muestra un acceso "Etiquetas" que, al
  expandirse, lista `Lectura`
- **AND** `Compras` no aparece ahí porque ya se muestra en Favoritos

#### Scenario: Hacer clic en una etiqueta de la lista navega a su página

- **WHEN** el usuario expande el acceso "Etiquetas" y hace clic en
  `Lectura`
- **THEN** la aplicación navega a `/etiquetas/<id>` de `Lectura`
