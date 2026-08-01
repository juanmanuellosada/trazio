# conexion-google-calendar Specification

## Purpose
TBD - created by archiving change fase-4-calendario. Update Purpose after archive.
## Requirements
### Requirement: Autorización con Google exige acceso offline y consentimiento explícito

El flujo de autorización con Google SHALL solicitar los parámetros `access_type=offline` y `prompt=consent` en la primera autorización, porque sin ellos Google no devuelve refresh token y la conexión no puede sostenerse más allá de la sesión inicial.

#### Scenario: Autorización inicial pide acceso offline y consentimiento

- **WHEN** se inicia la conexión con Google Calendar desde Configuración →
  Calendarios
- **THEN** la URL de autorización generada incluye `access_type=offline` y
  `prompt=consent`
- **AND** Google devuelve un refresh token junto con el access token al
  completar el consentimiento

### Requirement: El refresh token se guarda cifrado y nunca llega al navegador

El refresh token obtenido de Google SHALL cifrarse con AES-256-GCM antes de guardarse en `calendar_connections.refresh_token`, usando una clave de 32 bytes que vive en una variable de entorno de servidor, y el valor cifrado NUNCA SHALL guardarse en texto plano ni SHALL llegar en ningún momento al navegador, ni en la respuesta de una ruta de API ni en ningún payload enviado al cliente.

#### Scenario: El refresh token se guarda cifrado

- **WHEN** se completa el intercambio del código de autorización por tokens
- **THEN** el valor guardado en `calendar_connections.refresh_token` es el
  ciphertext producido por AES-256-GCM, junto con su nonce y su tag de
  autenticación, y no el refresh token en claro

#### Scenario: El refresh token nunca sale del servidor

- **WHEN** se audita cualquier respuesta de una ruta de API bajo
  `app/api/auth/google/` o cualquier prop pasada a un componente cliente
- **THEN** ninguna de ellas contiene el refresh token, ni cifrado ni en claro

### Requirement: El secreto de cliente de Google permanece exclusivamente del lado servidor

`GOOGLE_CLIENT_SECRET` MUST NOT declararse con el prefijo `NEXT_PUBLIC_`, MUST NOT pasarse a ningún componente marcado `'use client'`, y MUST NOT aparecer en ningún log de la aplicación, siguiendo el mismo tratamiento que ya recibe `SUPABASE_SERVICE_ROLE_KEY`.

#### Scenario: El secreto de cliente nunca llega al navegador

- **WHEN** se audita el código fuente en busca de referencias a
  `GOOGLE_CLIENT_SECRET`
- **THEN** ninguna referencia está en un archivo marcado `'use client'`
- **AND** ninguna referencia usa el prefijo `NEXT_PUBLIC_`

### Requirement: Selección de qué calendarios se muestran

Una vez conectada la cuenta, Trazio SHALL listar los calendarios de Google del usuario y SHALL permitir elegir cuáles de ellos se muestran en Trazio, guardando esa selección en `calendar_connections.enabled_calendar_ids`.

#### Scenario: Elegir un subconjunto de calendarios

- **WHEN** la cuenta conectada tiene cuatro calendarios en Google y se eligen
  dos para mostrar en Trazio
- **THEN** `enabled_calendar_ids` queda con los dos identificadores elegidos
- **AND** solo esos dos calendarios aportan eventos a las vistas de Trazio

#### Scenario: Ningún calendario elegido no rompe la vista

- **WHEN** se desmarcan todos los calendarios habilitados
- **THEN** las vistas de Trazio siguen funcionando sin eventos, mostrando
  tareas y hábitos igual que siempre

### Requirement: Estado de la conexión y transición a needs_reauth

`calendar_connections.status` SHALL valer `active` mientras el refresh token sirva para obtener un access token válido, y SHALL pasar a `needs_reauth` en cuanto un intento de refresco falle, sin esperar a que el usuario lo note.

#### Scenario: Un refresh fallido marca la conexión como needs_reauth

- **WHEN** se intenta refrescar el access token y Google responde que el
  refresh token es inválido o fue revocado
- **THEN** `calendar_connections.status` pasa a `needs_reauth`

#### Scenario: Una conexión activa sigue activa mientras el refresh funcione

- **WHEN** se refresca el access token y Google devuelve un access token
  válido
- **THEN** `calendar_connections.status` permanece en `active`

### Requirement: Banner global de reconexión

Cuando `calendar_connections.status` vale `needs_reauth`, Trazio SHALL mostrar un banner visible en todas las pantallas donde puede aparecer un evento, con una acción directa para reconectar, y ese banner NUNCA SHALL usar el rojo de marca `#EC1E2A` reservado por D5 para la prioridad Urgente y los errores de formulario.

#### Scenario: El banner aparece en cualquier pantalla con eventos

- **WHEN** `calendar_connections.status` es `needs_reauth` y se navega a Hoy,
  Próximos, Bandeja de entrada o un Proyecto
- **THEN** el banner de reconexión es visible en cualquiera de esas pantallas

#### Scenario: El banner no usa el rojo de marca

- **WHEN** se inspecciona el color del banner de reconexión
- **THEN** no es `#EC1E2A` ni ningún tono equivalente reservado a Urgente o a
  errores de formulario

#### Scenario: Reconectar desde el banner resuelve el estado

- **WHEN** se completa el flujo de autorización desde la acción del banner
- **THEN** `calendar_connections.status` vuelve a `active` y el banner deja de
  mostrarse

### Requirement: Desconectar la cuenta sin borrar datos de Trazio

Trazio SHALL ofrecer una acción para desconectar la cuenta de Google, que SHALL borrar el registro de `calendar_connections` del usuario, y esa acción MUST NOT borrar ninguna tarea, hábito, proyecto, etiqueta ni ningún otro dato propio de Trazio.

#### Scenario: Desconectar borra solo la conexión

- **WHEN** se confirma la desconexión de la cuenta de Google
- **THEN** el registro de `calendar_connections` de ese usuario se elimina
- **AND** ninguna tarea, hábito, proyecto ni etiqueta del usuario se ve
  afectada

#### Scenario: Después de desconectar, las vistas dejan de mostrar eventos

- **WHEN** se navega a Hoy o a Próximos después de desconectar
- **THEN** ya no aparece ningún evento de Google, y tareas y hábitos se
  muestran con normalidad

