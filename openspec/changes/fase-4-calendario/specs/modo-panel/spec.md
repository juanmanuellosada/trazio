## MODIFIED Requirements

### Requirement: El modo panel está disponible en Bandeja, Proyecto y Próximos

El modo panel SHALL estar disponible como forma de ver alternativa a la lista únicamente en las vistas Bandeja de entrada, Proyecto y Próximos. El modo calendario es una forma de ver aparte, definida por la capacidad `vista-calendario`, y no forma parte de esta capacidad.

#### Scenario: El selector de forma de ver ofrece panel en Bandeja

- **WHEN** el usuario abre la barra de opciones de vista en la Bandeja de entrada
- **THEN** el selector de forma de ver ofrece "panel" entre sus opciones

#### Scenario: El modo panel no existe fuera de esas tres vistas

- **WHEN** el usuario abre la barra de opciones de vista en Hoy, en la página de una etiqueta o en la página de un filtro
- **THEN** el selector de forma de ver no ofrece la opción "panel"
