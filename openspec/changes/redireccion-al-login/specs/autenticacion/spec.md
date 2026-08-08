## MODIFIED Requirements

### Requirement: Middleware de protección de rutas privadas

Un middleware SHALL proteger todas las rutas bajo `app/(app)/**` y SHALL distinguir dos situaciones que NUNCA deben tratarse igual:

- **Sin sesión**: la petición no trae cookies de sesión. El middleware SHALL redirigir a la pantalla de login.
- **Sesión no verificada**: la petición trae cookies de sesión pero la verificación no pudo confirmarlas en ese instante —falla de red contra el proveedor de identidad, error al obtener las claves de firma, respuesta 5xx o límite de tasa—. El middleware NUNCA SHALL redirigir: SHALL dejar pasar la petición con sus cookies intactas, y la página resolverá con su propia verificación.

La decisión SHALL tomarse por presencia de las cookies de sesión, NUNCA clasificando el error devuelto por el proveedor de identidad, que no es un contrato estable.

Una falla transitoria de verificación NUNCA es una persona sin sesión. Tratarlas igual expulsa al login a alguien cuya sesión está viva, que es el defecto que este requisito existe para impedir.

Toda redirección a la pantalla de login SHALL conservar el destino original para volver ahí después de iniciar sesión, venga del middleware o de una página.

#### Scenario: Visita sin sesión a una ruta privada redirige a login

- **WHEN** una persona sin cookies de sesión visita cualquier URL bajo
  `app/(app)/**`
- **THEN** el middleware la redirige a la pantalla de login
- **AND** la URL de destino original queda conservada

#### Scenario: Una falla transitoria de verificación no expulsa

- **WHEN** una petición a una ruta privada trae cookies de sesión y la verificación
  falla por una causa transitoria
- **THEN** el middleware NUNCA SHALL redirigir a login
- **AND** la petición SHALL seguir con sus cookies intactas

#### Scenario: La decisión no depende del tipo de error

- **WHEN** la verificación devuelve un error cualquiera con cookies de sesión presentes
- **THEN** el middleware SHALL dejar pasar la petición sin inspeccionar de qué error se trata

#### Scenario: Una sesión realmente inválida termina en el login igual

- **WHEN** una petición trae cookies de sesión ya revocadas y el middleware la deja pasar
- **THEN** la página SHALL redirigir a la pantalla de login
- **AND** la URL de destino original queda conservada

## ADDED Requirements

### Requirement: Toda redirección al login conserva el destino

Cualquier redirección a la pantalla de login desde una ruta protegida SHALL conservar la URL de destino original, sin importar qué la haya originado. NUNCA SHALL existir un camino al login que pierda el destino.

Una ruta que responde 404 por un parámetro inexistente queda fuera de este requisito: no es una redirección al login y no tiene destino que conservar.

#### Scenario: El redirect de una página conserva el destino

- **WHEN** una página protegida no puede verificar la sesión y redirige al login
- **THEN** la URL de destino original SHALL quedar conservada, igual que si hubiera
  redirigido el middleware

#### Scenario: Ningún camino al login pierde el destino

- **WHEN** se recorren todas las rutas protegidas sin una sesión verificable
- **THEN** todas las que terminan en la pantalla de login SHALL haber conservado su
  destino original
