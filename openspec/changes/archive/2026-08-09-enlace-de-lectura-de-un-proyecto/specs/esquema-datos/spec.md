## ADDED Requirements

### Requirement: Token de lectura en projects

`projects` SHALL tener una columna de token de lectura, nullable —nulo significa no compartido—, con índice único.

El token SHALL generarse en la base de datos con al menos 256 bits de aleatoriedad. NUNCA SHALL derivarse del identificador del proyecto ni de ningún otro dato de la fila.

#### Scenario: Un proyecto sin compartir tiene el token en nulo

- **WHEN** se crea un proyecto
- **THEN** su token de lectura SHALL ser nulo

#### Scenario: El token es único

- **WHEN** se intenta guardar un token que ya existe en otra fila
- **THEN** la operación SHALL ser rechazada

### Requirement: Función de lectura pública, SECURITY DEFINER otorgada solo al rol anónimo

SHALL existir una función `security definer` con `search_path` acotado que reciba un token y devuelva el proyecto compartido con sus secciones y tareas.

El permiso de ejecución SHALL revocarse de `public` y otorgarse únicamente al rol anónimo. Es la única función del esquema otorgada a ese rol.

La función SHALL enumerar explícitamente cada columna que devuelve y NUNCA SHALL usar `select *`.

#### Scenario: El rol anónimo puede ejecutarla

- **WHEN** el rol anónimo invoca la función con un token válido
- **THEN** SHALL recibir el proyecto compartido

#### Scenario: No devuelve nada con un token inválido

- **WHEN** se invoca con un token que no corresponde a ningún proyecto compartido
- **THEN** NUNCA SHALL devolver contenido
