## ADDED Requirements

### Requirement: Registro con nombre, correo y contraseña

El sistema SHALL permitir crear una cuenta con nombre, correo electrónico y
contraseña de al menos 8 caracteres.

#### Scenario: Registro exitoso con datos válidos

- **WHEN** una persona completa el formulario de registro con nombre, correo
  válido y contraseña de 8 caracteres o más
- **THEN** la cuenta se crea
- **AND** se envía el correo de confirmación

#### Scenario: Contraseña de menos de 8 caracteres se rechaza

- **WHEN** se intenta registrar con una contraseña de menos de 8 caracteres
- **THEN** el registro SHALL rechazarse
- **AND** se muestra un mensaje de error con las tres partes de
  `.claude/rules/copy.md` (qué pasó, por qué, qué hacer), sin código técnico

### Requirement: Validación de contraseña en tres capas

La regla de mínimo 8 caracteres SHALL aplicarse con el mismo esquema de Zod en
el cliente y en el servidor, y SHALL configurarse además como longitud mínima
en la configuración de Supabase Auth. La validación de cliente es cortesía, no
seguridad: ninguna de las tres capas puede omitirse confiando en las otras dos.

#### Scenario: El esquema de Zod es el mismo en cliente y servidor

- **WHEN** se compara el esquema usado por el formulario de registro en el
  cliente con el usado por la acción o endpoint de servidor que crea la cuenta
- **THEN** ambos importan el mismo esquema de Zod definido en `lib/validation/`
- **AND** la regla de longitud mínima es idéntica en los dos

#### Scenario: Supabase Auth también rechaza contraseñas cortas

- **WHEN** se intenta crear una cuenta directamente contra Supabase Auth con
  una contraseña de menos de 8 caracteres, sin pasar por el formulario de la app
- **THEN** Supabase Auth rechaza la operación por su propia configuración de
  longitud mínima

### Requirement: Registro e inicio de sesión con Google OAuth

El sistema SHALL permitir registrarse e iniciar sesión con una cuenta de
Google, como alternativa al registro por correo y contraseña.

#### Scenario: Primer inicio de sesión con Google crea la cuenta

- **WHEN** una persona nueva elige continuar con Google y autoriza el acceso
- **THEN** se crea su cuenta en Trazio con los datos provistos por Google
- **AND** queda con sesión iniciada

#### Scenario: Un inicio de sesión posterior con Google reconoce la cuenta existente

- **WHEN** una persona que ya se registró con Google vuelve a elegir continuar
  con Google
- **THEN** inicia sesión en la misma cuenta, sin crear una cuenta duplicada

### Requirement: Confirmación de correo electrónico

Después de un registro por correo y contraseña, el sistema SHALL enviar un
correo de confirmación a través de Resend.

#### Scenario: El correo de confirmación se envía tras el registro

- **WHEN** una persona completa el registro con correo y contraseña
- **THEN** Resend envía un correo de confirmación a la dirección registrada
- **AND** la cuenta queda sin confirmar hasta que se haga clic en el enlace

#### Scenario: El enlace de confirmación activa la cuenta

- **WHEN** se hace clic en el enlace de confirmación recibido por correo
- **THEN** la cuenta queda confirmada
- **AND** la persona puede iniciar sesión normalmente

### Requirement: Recuperación de contraseña de punta a punta

El sistema SHALL implementar el flujo completo de recuperación de contraseña:
pedir el correo, enviar el enlace vía Resend, mostrar una página de reset real
que valida el token, aceptar la contraseña nueva, e iniciar sesión
automáticamente. Este flujo es un criterio de aceptación de la fase 1 y SHALL
verificarse con un test end-to-end que lee el correo desde el entorno de
prueba, no a mano.

#### Scenario: Pedido de recuperación envía el correo

- **WHEN** una persona ingresa su correo en la pantalla de recuperar contraseña
- **THEN** Resend envía un correo con un enlace de reset a esa dirección

#### Scenario: La página de reset valida el token antes de aceptar la nueva contraseña

- **WHEN** se abre el enlace de reset con un token inválido o vencido
- **THEN** la página SHALL rechazar el acceso al formulario de nueva contraseña
- **AND** SHALL mostrar un mensaje de error con las tres partes de
  `.claude/rules/copy.md`, sin código técnico

#### Scenario: Completar el reset deja la sesión iniciada

- **WHEN** se abre el enlace de reset con un token válido y se define una
  contraseña nueva de 8 caracteres o más
- **THEN** la contraseña de la cuenta se actualiza
- **AND** la persona queda con sesión iniciada, sin tener que loguearse a mano
  después

#### Scenario: El flujo se verifica en e2e leyendo el correo real

- **WHEN** corre la suite end-to-end del flujo de recuperación de contraseña
- **THEN** el test SHALL leer el correo de reset desde el entorno de prueba
- **AND** el test MUST NOT depender de que una persona copie el enlace a mano

### Requirement: Middleware de protección de rutas privadas

Un middleware SHALL proteger todas las rutas bajo `app/(app)/**` y SHALL
redirigir a la pantalla de login a cualquier visita sin sesión, conservando el
destino original para volver ahí después de iniciar sesión.

#### Scenario: Visita sin sesión a una ruta privada redirige a login

- **WHEN** una persona sin sesión iniciada visita cualquier URL bajo
  `app/(app)/**`
- **THEN** el middleware la redirige a la pantalla de login
- **AND** la URL de destino original queda conservada

#### Scenario: Tras el login se vuelve al destino original

- **WHEN** una persona redirigida a login por el middleware completa el login
  exitosamente
- **THEN** vuelve a la URL que había intentado visitar originalmente, no a una
  pantalla genérica

### Requirement: Clientes de Supabase para servidor, navegador y middleware

El sistema SHALL usar `@supabase/ssr` con tres clientes distintos: uno para
Server Components y Route Handlers, uno para el navegador, y uno para el
middleware, cuya responsabilidad SHALL ser refrescar la sesión en cada
petición.

#### Scenario: Existen los tres clientes

- **WHEN** se inspecciona `lib/supabase/`
- **THEN** existe un cliente de servidor, un cliente de navegador y un cliente
  de middleware, cada uno construido con `@supabase/ssr`

#### Scenario: El cliente de middleware refresca la sesión

- **WHEN** una petición llega con una sesión próxima a expirar o expirada pero
  renovable
- **THEN** el cliente de middleware refresca la sesión antes de que la
  petición llegue al resto de la app

### Requirement: Aprovisionamiento automático de la cuenta al registrarse

Al crearse un usuario nuevo, un trigger de base de datos SHALL crear en una
sola transacción su perfil, sus preferencias y su proyecto Bandeja de entrada.
La Bandeja SHALL existir ya en el primer inicio de sesión, sin ninguna acción
manual de la persona ni de un proceso separado de la app.

#### Scenario: El registro deja perfil, preferencias y Bandeja creados

- **WHEN** se completa un registro nuevo, por correo o por Google
- **THEN** existe una fila en `profiles` para ese usuario
- **AND** existe una fila en `user_preferences` para ese usuario
- **AND** existe un proyecto con `is_inbox = true` para ese usuario

#### Scenario: Las tres filas se crean o ninguna

- **WHEN** el trigger de aprovisionamiento falla en cualquiera de sus tres
  inserciones
- **THEN** ninguna de las tres queda creada, porque corren en una única
  transacción

#### Scenario: La Bandeja ya existe en el primer login

- **WHEN** una persona recién registrada inicia sesión por primera vez
- **THEN** su Bandeja de entrada ya está creada y visible, sin pantalla de
  configuración inicial ni paso manual adicional

### Requirement: Cierre de sesión

Cerrar sesión SHALL terminar la sesión en el servidor y SHALL limpiar todo lo
guardado localmente en el navegador: caché de TanStack Query, tokens y
cualquier otro estado local asociado a la sesión.

#### Scenario: Cerrar sesión limpia el estado local

- **WHEN** una persona con sesión iniciada elige cerrar sesión
- **THEN** la sesión se termina en el servidor
- **AND** el caché local de TanStack Query queda vacío
- **AND** una visita posterior a una ruta privada la redirige a login como si
  nunca hubiera iniciado sesión

### Requirement: Mensajes de error de autenticación siguen las reglas de redacción

Todo mensaje de error de autenticación SHALL seguir `.claude/rules/copy.md`:
tres partes (qué pasó, por qué, qué hacer), sin culpar a la persona usuaria y
sin códigos técnicos visibles. Aplica a registro, login, Google, confirmación,
reset y middleware.

#### Scenario: Un error de autenticación muestra las tres partes

- **WHEN** cualquier operación de autenticación falla, por ejemplo
  credenciales inválidas, correo ya registrado, token de reset vencido o error
  de red
- **THEN** el mensaje mostrado indica qué pasó, por qué pasó y qué hacer
- **AND** no incluye códigos de error técnicos ni culpa a la persona usuaria
  por el fallo

### Requirement: Flujo de aceptación de fase 1 sin intervención manual

Este flujo SHALL completarse sin ninguna intervención manual en ningún paso:
registrarse, confirmar el correo, olvidar la contraseña, recuperarla y volver
a entrar. Es el criterio de aceptación literal de la fase 1.

#### Scenario: El flujo completo corre de punta a punta

- **WHEN** una persona se registra con correo y contraseña, confirma el correo
  desde el enlace recibido, pide recuperar la contraseña, define una nueva
  desde el enlace de reset, y por último vuelve a intentar entrar
- **THEN** cada paso se completa sin que nadie intervenga manualmente fuera
  del flujo automatizado, por ejemplo sin copiar tokens a mano ni editar la
  base de datos
- **AND** al final la persona queda con sesión iniciada usando la contraseña
  nueva
