## MODIFIED Requirements

### Requirement: Variables de entorno de fase 1

El sistema SHALL definir, junto a las variables de fase 1 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` y `RESEND_API_KEY`) y las de fase 2 (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`), las variables de la conexión con Google Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y la clave de cifrado del refresh token de la decisión D-A de `openspec/changes/fase-4-calendario/design.md`. `SUPABASE_SERVICE_ROLE_KEY` SHALL permanecer exclusivamente del lado servidor: MUST NOT declararse con el prefijo `NEXT_PUBLIC_`, MUST NOT pasarse a un componente cliente y MUST NOT aparecer en ningún log de la aplicación. `GOOGLE_CLIENT_SECRET` y la clave de cifrado SHALL cumplir la misma restricción que `SUPABASE_SERVICE_ROLE_KEY`: MUST NOT declararse con el prefijo `NEXT_PUBLIC_`, MUST NOT pasarse a un componente cliente y MUST NOT aparecer en ningún log de la aplicación.

#### Scenario: Documentación de variables de entorno

- **WHEN** se revisa el archivo de ejemplo de variables de entorno del proyecto (por ejemplo `.env.example`)
- **THEN** figuran las variables de Supabase y Resend de fase 1, y las de VAPID de fase 2, con su alcance (cliente+servidor o solo servidor)
- **AND** figuran `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y la clave de cifrado del refresh token, con `GOOGLE_CLIENT_SECRET` y la clave de cifrado marcadas como exclusivas del servidor

#### Scenario: La service role key nunca llega al cliente

- **WHEN** se audita el código fuente en busca de referencias a `SUPABASE_SERVICE_ROLE_KEY`
- **THEN** ninguna referencia está en un archivo marcado `'use client'`
- **AND** ninguna referencia usa el prefijo `NEXT_PUBLIC_`
- **AND** ninguna llamada de logging (`console.*` o equivalente) incluye su valor

#### Scenario: El secreto de cliente de Google y la clave de cifrado nunca llegan al cliente

- **WHEN** se audita el código fuente en busca de referencias a `GOOGLE_CLIENT_SECRET` o a la clave de cifrado del refresh token
- **THEN** ninguna referencia está en un archivo marcado `'use client'`
- **AND** ninguna referencia usa el prefijo `NEXT_PUBLIC_`
- **AND** ninguna llamada de logging (`console.*` o equivalente) incluye su valor
