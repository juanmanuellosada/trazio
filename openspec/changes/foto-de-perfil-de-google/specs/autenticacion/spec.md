## ADDED Requirements

### Requirement: El alta de cuenta copia la foto de perfil

El trigger de aprovisionamiento SHALL copiar la foto de perfil desde los metadatos de la cuenta a `profiles.avatar_url`, resolviéndola con el mismo criterio con que ya resuelve el nombre: la primera clave disponible entre las que usan los distintos proveedores.

Una cuenta sin foto en sus metadatos SHALL quedar con `avatar_url` nulo, sin error.

La migración que cambia el trigger SHALL hacer, en el mismo archivo, el backfill de las cuentas existentes desde sus metadatos.

#### Scenario: Un alta con Google guarda la foto

- **WHEN** se crea una cuenta con Google y sus metadatos traen una foto de perfil
- **THEN** `profiles.avatar_url` SHALL quedar con esa URL

#### Scenario: Un alta con correo y contraseña no falla sin foto

- **WHEN** se crea una cuenta con correo y contraseña, sin foto en los metadatos
- **THEN** `profiles.avatar_url` SHALL quedar nulo y el alta SHALL completarse igual

#### Scenario: Las cuentas existentes reciben su foto

- **WHEN** se aplica la migración sobre una base con cuentas que tienen foto en sus metadatos
- **THEN** esas cuentas SHALL quedar con su `avatar_url` cargado

### Requirement: La foto se refresca al iniciar sesión

Al iniciar sesión, si los metadatos de la cuenta traen una foto distinta de la guardada, `profiles.avatar_url` SHALL actualizarse. Una foto copiada una sola vez al registrarse quedaría vieja para siempre.

#### Scenario: Cambiar la foto en Google se refleja al volver a entrar

- **WHEN** una persona cambia su foto en Google y vuelve a iniciar sesión en Trazio
- **THEN** `profiles.avatar_url` SHALL quedar con la foto nueva
