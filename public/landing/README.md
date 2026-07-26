# Capturas de la landing

Las siete imágenes de esta carpeta son capturas reales del producto, sacadas
con Playwright contra una cuenta demo sembrada en el Supabase **local**. Nunca
se generan ni se sirven desde producción.

## Qué se sembró

`scripts/seed-landing-demo.mjs` crea (o recrea, si ya existe) la cuenta
`sofia.bianchi@example.com` con una semana representativa:

- Cinco proyectos con color e ícono — Casa, Trabajo (con el subproyecto
  Cliente Acme anidado), Estudio, Finanzas — cada uno con varias tareas, y
  una sección con contenido real en Casa ("Este mes", "Pendiente") y en
  Trabajo ("Sprint actual"). Ningún proyecto queda vacío ni con una sola
  tarea completada.
- Doce tareas entre atrasadas y de hoy (con hora y sin hora) para que la
  vista Hoy se vea llena en escritorio, más tareas de la semana que viene,
  sin fecha en la Bandeja de entrada y en los proyectos, y algunas
  completadas.
- Prioridades variadas, incluida al menos una Urgente.
- Una tarea con subtareas anidadas en tres niveles ("Organizar la mudanza" →
  "Embalar la cocina" → "Comprar cajas y cinta" / "Envolver la vajilla").
- Dos etiquetas ("Importante", "Compras") y duraciones en varias tareas.

## Las siete capturas

| Archivo | Qué muestra |
| --- | --- |
| `today-hero.webp` | Hoy, ancha — hero: panel lateral visible, atrasadas arriba |
| `inbox.webp` | Bandeja de entrada |
| `today-detail.webp` | Hoy, recorte cerrado sobre atrasadas + las de hoy |
| `projects-sections.webp` | Árbol del panel lateral + Casa con sus secciones |
| `priorities-dates.webp` | Recorte angosto de Casa: prioridad y fecha de cada tarea, grandes |
| `subtasks.webp` | "Organizar la mudanza" con sus subtareas en tres niveles |
| `sync.webp` | Escritorio y celular con la misma tarea recién completada, sincronizados por Realtime |

Todas están en formato WebP, a `deviceScaleFactor: 2` (retina). Declarar
`width`/`height` iguales a los del archivo en el `<img>`/`<Image>` de la
landing evita salto de layout.

## Cómo regenerar

1. **Supabase local arriba**: `pnpm supabase start` (o confirmar con
   `pnpm supabase status` que ya está corriendo).
2. **Reset + sembrado**, contra local, nunca contra `.env.local`:

   ```bash
   pnpm supabase db reset
   SUPABASE_URL="$(pnpm supabase status -o env | grep API_URL | cut -d'"' -f2)" \
   SUPABASE_SERVICE_ROLE_KEY="$(pnpm supabase status -o env | grep SERVICE_ROLE_KEY | cut -d'"' -f2)" \
   node scripts/seed-landing-demo.mjs
   ```

3. **Build + start en modo producción**, con las variables de entorno
   apuntando a local pasadas en línea (nunca escritas en `.env.local`): el
   servidor de desarrollo (`next dev`) muestra un indicador flotante de
   herramientas de desarrollo que no tiene que salir en ninguna captura, así
   que las capturas se sacan contra `next build && next start`, no `next dev`.

   ```bash
   NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<PUBLISHABLE_KEY de supabase status>" \
   NEXT_PUBLIC_SITE_URL="http://localhost:3000" \
   SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY de supabase status>" \
   RESEND_API_KEY="no-hace-falta-para-esto" \
   pnpm build

   NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<PUBLISHABLE_KEY de supabase status>" \
   NEXT_PUBLIC_SITE_URL="http://localhost:3000" \
   SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY de supabase status>" \
   RESEND_API_KEY="no-hace-falta-para-esto" \
   npx next start -p 3000
   ```

4. **Capturas**:

   ```bash
   APP_URL="http://localhost:3000" \
   DEMO_EMAIL="sofia.bianchi@example.com" \
   DEMO_PASSWORD="TrazioDemo2026!" \
   pnpm landing:screenshots
   ```

5. Apagar el servidor (`kill` del proceso de `next start`) al terminar.

`scripts/capture-landing-screenshots.mjs` no tiene nada hardcodeado más que
los textos de las tareas sembradas (para ubicarlas en la interfaz): URL de la
app y credenciales de la cuenta demo salen de variables de entorno.
