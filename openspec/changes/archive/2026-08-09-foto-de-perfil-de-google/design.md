## Context

`supabase/migrations/20260726011557_profiles.sql` crea `profiles` con
`full_name` **y `avatar_url`**. El trigger `handle_new_user()`
(`20260726013248`) inserta solo `id` y `full_name`, resolviendo el nombre con
`coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')` —un
comentario explica que los dos proveedores completan campos distintos—. El
avatar quedó afuera de ese `insert`.

Google entrega la foto en los metadatos bajo `avatar_url` y también `picture`.

## Goals / Non-Goals

**Goals:** que la foto aparezca donde ya se muestra la cuenta, sin tablas
nuevas y sin romper a quien no tiene foto.

**Non-Goals:** subir, recortar o editar una foto propia. Avatares de otras
personas (no hay otras personas). Cachear la imagen del lado de Trazio.

## Decisions

### D-A — Mismo `coalesce` que el nombre

`coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')`.
Google manda las dos claves y otros proveedores usan una u otra; el trigger ya
resuelve el nombre así y no hay motivo para inventar un patrón distinto al
lado.

### D-B — Se refresca al iniciar sesión, no solo al registrarse

Copiar la foto una vez al alta la congela: la persona cambia su foto en Google
y Trazio le sigue mostrando la vieja para siempre. Al iniciar sesión, si los
metadatos traen una foto distinta de la guardada, se actualiza.

**Alternativa considerada:** no guardar nada y leer la foto del `user_metadata`
de la sesión en cada render. Siempre fresca y sin migración. Se descarta
porque el layout ya consulta `profiles` para el nombre: leer la foto de otro
lado partiría en dos el origen de los datos de la cuenta, y la columna ya
existe para esto.

### D-C — Backfill en la misma migración

Las cuentas existentes ya tienen la foto en sus metadatos —nunca se copió, pero
está—. El backfill va en el mismo archivo que cambia el trigger. Sin él, la
foto aparecería recién al próximo login, y la única cuenta que hoy existe
tendría que desloguearse para verla.

### D-D — `<img>` simple, no `next/image`

`next.config.ts` no declara `images.remotePatterns`, así que `next/image`
rechazaría el host de Google. Se podría agregar, pero para un avatar de 32px
el optimizador no aporta nada y sí mete a Vercel de intermediario en cada
carga.

Un `<img>` con alto y ancho explícitos, `referrerPolicy="no-referrer"` —Google
rechaza algunas peticiones según el referer— y respaldo a iniciales si la
carga falla.

**Consecuencia aceptada:** cada render pide la imagen a un host de Google. Es
lo que ya hace cualquier app que muestra el avatar de Google, y evitarlo
pediría cachear la imagen del lado de Trazio, que es un no-goal.

### D-E — Las iniciales no son un respaldo temporal

Quien se registró con correo y contraseña no tiene foto y nunca la va a tener.
Las iniciales no son un estado de carga: son el caso normal para esa mitad de
las cuentas. El componente muestra iniciales por defecto y la foto encima
cuando existe y carga bien, nunca al revés.

## Risks / Trade-offs

**[La URL de la foto de Google puede dejar de responder]** → D-D: si la imagen
falla, se ven las iniciales. Hay que cablearlo explícitamente, no confiar en
que el navegador muestre algo razonable.

**[Un `<img>` externo en una app que por lo demás no pide nada afuera]** →
Aceptado y explícito. Si alguna vez se quiere cortar, la salida es copiar la
imagen al alta, y eso es otra propuesta.
