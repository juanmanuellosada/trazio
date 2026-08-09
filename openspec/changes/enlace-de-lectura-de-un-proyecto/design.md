## Context

Las 19 tablas de `public` tienen 76 políticas y **las 76** se apoyan en
`auth.uid()`. El invariante del proyecto es que cada fila pertenece a
exactamente una persona, y está cementado también en D11 (`user_id` propio en
todas las tablas) y en el filtro por `user_id` del realtime.

Un enlace de lectura **no toca ese invariante**, y ahí está todo su valor
frente a la colaboración: quien mira no es un usuario. No hay `auth.uid()` que
ampliar. Hay una función que, dado un secreto, devuelve una porción acotada.

La descripción de una tarea se guarda como **JSONB de Tiptap**, no como HTML.
El único `dangerouslySetInnerHTML` del repositorio está en el puente de
analítica del marketing.

## Goals / Non-Goals

**Goals:** mostrar un proyecto a alguien sin cuenta, sin abrir ninguna puerta
de escritura y sin filtrar nada más que lo declarado.

**Non-Goals:** editar, comentar, cuentas invitadas, contraseña o vencimiento
del enlace, compartir etiquetas o filtros, y realtime en la vista pública.

## Decisions

### D-A — Un token de 256 bits generado por la base, nunca el id del proyecto

`encode(gen_random_bytes(32), 'base64')` normalizado a base64url. El id del
proyecto NUNCA sirve como enlace: es adivinable a partir de cualquier lugar
donde ya aparezca, y no es revocable sin borrar el proyecto.

Con 256 bits, adivinar no es una amenaza real y no hace falta limitar
intentos. Lo que sí hace falta es que el token **no se derive de nada**: se
genera aleatorio y se guarda.

### D-B — Una sola función `security definer`, con las columnas escritas a mano

`get_shared_project(p_token text)`, `security definer`, `search_path`
acotado, `revoke all from public` y `grant execute to anon`.

Tres reglas que no son opcionales:

1. **Recibe el token y nada más.** NUNCA un id de proyecto. Si aceptara un id,
   quien lo tenga leería cualquier proyecto.
2. **Enumera las columnas.** NUNCA `select *`. El día que `tasks` gane una
   columna —pasó tres veces esta semana— un `select *` la publicaría sola. La
   lista explícita convierte una fuga futura en un cambio deliberado.
3. **Devuelve lo mismo para un token inexistente que para uno revocado.** No
   distinguir evita confirmarle a alguien que un enlace existió.

Es la única función del proyecto otorgada al rol anónimo. Merece leerse dos
veces.

### D-C — El token viaja en la URL, así que hay que tapar la fuga por `Referer`

Este es el riesgo que no salta a la vista. La descripción de una tarea admite
enlaces. Si quien mira toca uno, el navegador manda el `Referer` al destino —y
el `Referer` **es la URL con el token**. Cualquier sitio enlazado desde una
tarea recibiría la llave.

Dos medidas, las dos necesarias:

- `Referrer-Policy: no-referrer` en la ruta pública.
- Todo enlace saliente que la vista renderice, con `rel="noopener noreferrer"`.

### D-D — Nada de indexación

`X-Robots-Tag: noindex, nofollow` como cabecera y la meta equivalente. Sin
esto, un enlace pegado en cualquier lado termina en un buscador, y el enlace
deja de ser "quien yo le pasé" para ser "cualquiera".

### D-E — Lista blanca de qué se publica

Se publica: nombre, color e ícono del proyecto; nombre y descripción de las
secciones; y de cada tarea el título, la descripción, la fecha de vencimiento,
la fecha límite, la prioridad, si está completada y sus subtareas.

No se publica: comentarios —una conversación privada sobre esa tarea—,
recordatorios, etiquetas —son personales y transversales a toda la cuenta—,
duración estimada, posiciones, y cualquier identificador de la cuenta.

La regla general: si un dato dice algo de la persona en vez de decir algo del
proyecto, no sale.

### D-F — La vista pública no comparte layout con la aplicación

Vive fuera de `app/(app)/`. Ese layout consulta perfil, preferencias, árbol de
proyectos y contadores con la sesión de quien mira; en una visita anónima eso
no tiene sentido, y en una visita **de otra persona logueada** sería peor:
vería el proyecto compartido dentro de su propio panel lateral, mezclando dos
cuentas en pantalla.

Página propia, sin panel, sin atajos, sin cursor de lista.

### D-G — Se renderiza el JSONB, nunca HTML crudo

La descripción ya se guarda como documento de Tiptap. La vista pública lo
renderiza desde esa estructura, igual que la aplicación. NUNCA SHALL
introducirse un `dangerouslySetInnerHTML` en este camino: es contenido de una
persona mostrado a terceros, que es exactamente el escenario donde un renderer
laxo se convierte en un problema de todos.

### D-H — Archivar no revoca; revocar es explícito

Un proyecto archivado sigue accesible por su enlace. Archivar es organización
personal, no una decisión sobre quién puede mirar. Mezclarlas haría que
ordenar el panel lateral cortara accesos sin avisar.

Borrar el proyecto sí corta el enlace, por cascada.

## Risks / Trade-offs

**[Un enlace filtrado es acceso permanente hasta que se revoque]** → Es la
naturaleza de un enlace público y hay que decirlo en la interfaz cuando se
genera, no enterrarlo. Regenerar es de un toque.

**[La función `security definer` es la superficie más sensible del proyecto]**
→ D-B: tres reglas concretas y verificables, con tests que las ejerciten —
incluido uno que confirme que no acepta un id de proyecto.

**[Una columna futura en `tasks` podría publicarse sola]** → D-B regla 2: lista
explícita. Vale un test que falle si la función pasa a devolver más columnas de
las declaradas.

**[Alguien logueado abre un enlace ajeno]** → D-F: la vista no usa su sesión
para nada, así que ve lo mismo que un anónimo.
