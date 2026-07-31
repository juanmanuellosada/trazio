# sincronizacion-tiempo-real Specification

## Purpose
TBD - created by archiving change fase-1-base-usable. Update Purpose after archive.
## Requirements
### Requirement: Lectura inicial en Server Components
Cada vista de fase 1 SHALL ser un Server Component que lee los datos con el cliente de servidor de Supabase y siembra el caché de TanStack Query con esa lectura.

#### Scenario: Siembra del caché al cargar una vista
- **WHEN** el usuario navega a la Bandeja de entrada, Hoy, un Proyecto o Completado
- **THEN** el servidor consulta Supabase con el cliente de servidor
- **AND** el caché de TanStack Query se siembra con esos datos antes de que la interfaz se muestre interactiva
- **AND** el cliente no repite ese mismo pedido con un fetch adicional al montar la vista

### Requirement: Mutaciones e invalidación en el cliente
Las mutaciones sobre tareas, proyectos y secciones, y la invalidación de las queries correspondientes, SHALL ejecutarse con TanStack Query del lado del cliente.

#### Scenario: Una mutación se resuelve en el cliente
- **WHEN** el usuario completa, edita, mueve o reordena una tarea
- **THEN** la mutación se ejecuta con TanStack Query en el cliente
- **AND** la invalidación de la query afectada también ocurre en el cliente

### Requirement: Sin librería de estado global
La implementación de fase 1 NO SHALL incorporar ninguna librería de estado global. El estado de la aplicación se resuelve exclusivamente con Server Components, TanStack Query y `useState` local, según la decisión D12.

#### Scenario: Ninguna dependencia de estado global en el proyecto
- **WHEN** se audita el `package.json` de la aplicación
- **THEN** no aparece ninguna librería de estado global (por ejemplo Redux, Zustand o Jotai) entre las dependencias

### Requirement: Suscripción Realtime por tabla filtrada por usuario

La aplicación SHALL mantener una suscripción de Realtime, con su manejador de eventos correspondiente, por cada una de las tablas `tasks`, `projects`, `sections`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`, y cada suscripción SHALL estar filtrada por el `user_id` de la sesión activa. `labels` y `task_labels` siguen sin suscripción propia, `habit_schedule_overrides` queda deliberadamente fuera de Realtime según `docs/data-model.md`, y `calendar_connections` pertenece a la fase 4 y todavía no tiene suscripción.

#### Scenario: Suscripción activa sobre tasks, projects, sections, comments, reminders, filters, habits y habit_completions

- **WHEN** el usuario tiene una sesión iniciada
- **THEN** la aplicación mantiene una suscripción de Realtime, con su manejador de eventos, sobre `tasks`, `projects`, `sections`, `comments`, `reminders`, `filters`, `habits` y `habit_completions`
- **AND** cada una de esas suscripciones está filtrada por el `user_id` del usuario

#### Scenario: Sin suscripción a labels, task_labels, habit_schedule_overrides ni calendar_connections

- **WHEN** se audita la configuración de Realtime de esta fase
- **THEN** no existe ninguna suscripción a `labels`, `task_labels`, `habit_schedule_overrides` ni `calendar_connections`

### Requirement: Invalidación de Realtime y convivencia con mutaciones optimistas en vuelo
Al recibir un evento de Realtime sobre `tasks`, `projects` o `sections`, el manejador SHALL consultar si hay una mutación en vuelo sobre las claves afectadas. Si no hay ninguna, SHALL invalidar la query correspondiente de inmediato. Si hay una mutación en vuelo sobre esa misma clave, el manejador NO SHALL invalidar en el acto: SHALL marcar la clave como sucia y dejar que el `onSettled` de esa mutación sea quien invalide. En ningún caso el manejador muta el caché a mano.

#### Scenario: Sin mutación en vuelo, invalidación inmediata
- **WHEN** llega un evento de Realtime sobre una clave que no tiene ninguna mutación en vuelo
- **THEN** el manejador invalida esa query de inmediato
- **AND** el manejador no muta el caché a mano

#### Scenario: Con mutación en vuelo, invalidación diferida
- **WHEN** llega un evento de Realtime sobre una clave que sí tiene una mutación optimista en vuelo
- **THEN** el manejador no invalida esa query en el acto
- **AND** el manejador marca la clave como sucia
- **AND** la invalidación ocurre recién cuando el `onSettled` de esa mutación se ejecuta

### Requirement: Sincronización entre pestañas en menos de dos segundos
Un cambio hecho sobre una tarea, un proyecto o una sección en una pestaña o dispositivo SHALL reflejarse en otra pestaña o dispositivo con la misma cuenta en menos de dos segundos.

#### Scenario: Cambio visible entre pestañas
- **WHEN** un usuario con dos pestañas abiertas con la misma cuenta cambia una tarea en una de ellas
- **THEN** la otra pestaña muestra el cambio en menos de dos segundos

### Requirement: Optimistic updates con reversión
Completar, editar, mover y reordenar una tarea SHALL aplicar el patrón optimista: `onMutate` cancela las queries en vuelo sobre esa clave, guarda el estado anterior y aplica el cambio de inmediato en la interfaz; si el servidor rechaza el cambio, `onError` revierte al estado guardado y muestra un toast que explica qué pasó, por qué pasó y qué hacer; `onSettled` invalida la query correspondiente en cualquiera de los dos casos.

#### Scenario: Cambio optimista revertido ante rechazo del servidor
- **WHEN** el usuario completa, edita, mueve o reordena una tarea y el servidor rechaza el cambio
- **THEN** la interfaz mostró el cambio de inmediato antes de conocer la respuesta del servidor
- **AND** al llegar el rechazo, la interfaz vuelve al estado anterior
- **AND** se muestra un toast que explica qué pasó, por qué pasó y qué hacer
- **AND** la query correspondiente se invalida al terminar la mutación

### Requirement: Detección de estado sin conexión sin polling
La aplicación SHALL determinar si está sin conexión combinando tres señales, sin ningún healthcheck periódico: `navigator.onLine` como negativo rápido, el fallo de red de una query o mutación de TanStack Query como señal autoritativa, y el estado del canal de Realtime como confirmación. La aplicación SHALL considerarse sin conexión cuando `navigator.onLine` es falso, o cuando una query o mutación falla por red y el canal de Realtime está caído.

#### Scenario: navigator.onLine en falso
- **WHEN** `navigator.onLine` pasa a `false`
- **THEN** la aplicación se considera sin conexión de inmediato

#### Scenario: Fallo de red confirmado por el canal de Realtime caído
- **WHEN** una query o una mutación de TanStack Query falla por un error de red y el canal de Realtime está caído
- **THEN** la aplicación se considera sin conexión

#### Scenario: Fallo aislado sin confirmación no cuenta como sin conexión
- **WHEN** una query falla por red pero el canal de Realtime sigue conectado
- **THEN** la aplicación todavía no se considera sin conexión

#### Scenario: Sin healthcheck periódico
- **WHEN** se audita cómo la aplicación detecta la conexión
- **THEN** no existe ningún pedido periódico dedicado a comprobar la conectividad

### Requirement: Comportamiento de la interfaz en estado sin conexión
Mientras la aplicación está en estado sin conexión, SHALL mostrar un cartel persistente que lo informa, SHALL deshabilitar todos los campos de escritura, y SHALL volver inertes los botones de acción.

#### Scenario: Cartel, campos deshabilitados y botones inertes
- **WHEN** la aplicación está en estado sin conexión
- **THEN** muestra un cartel persistente que informa la falta de conexión
- **AND** todos los campos de escritura quedan deshabilitados
- **AND** todos los botones de acción quedan inertes

### Requirement: Sin cola de mutaciones ni caché de datos offline
Según la decisión D1, la aplicación NO SHALL encolar mutaciones para reintentar cuando vuelva la conexión, y NO SHALL mantener una caché de datos pensada para uso sin conexión. La aplicación avisa que no hay conexión en vez de prometer que el trabajo hecho sin conexión se va a sincronizar solo.

#### Scenario: Ninguna mutación pendiente se aplica sola al recuperar la conexión
- **WHEN** la aplicación estuvo sin conexión y la conexión vuelve
- **THEN** no aparece aplicada ninguna mutación que el usuario no haya podido confirmar mientras estaba online
- **AND** la aplicación no muestra ninguna cola de cambios pendientes de sincronizar

