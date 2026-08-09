## 1. Base de datos

- [ ] 1.1 Migración que cambia `handle_new_user()` para copiar `coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')` a `profiles.avatar_url`, con el mismo patrón que ya usa para el nombre (D-A).
- [ ] 1.2 En el MISMO archivo, backfill de las cuentas existentes desde sus metadatos (D-C). Sin esto, la única cuenta que hoy existe tendría que desloguearse para ver su foto.
- [ ] 1.3 Refrescar `avatar_url` al iniciar sesión cuando los metadatos traen una foto distinta de la guardada (D-B).
- [ ] 1.4 `pnpm db:types`.
- [ ] 1.5 Tests contra el Supabase local: alta con foto, alta sin foto, backfill, y refresco al cambiar la foto.

## 2. Interfaz

- [ ] 2.1 Sumar `avatar_url` al `select` de `profiles` que el layout ya hace.
- [ ] 2.2 Mostrar la foto en `components/layout/account-menu.tsx`, `components/layout/app-sidebar.tsx` y `components/settings/account-section.tsx`.
- [ ] 2.3 `<img>` con alto y ancho explícitos y `referrerPolicy="no-referrer"` (D-D). NO usar `next/image`: `next.config.ts` no declara `remotePatterns` y para 32px el optimizador no aporta.
- [ ] 2.4 Cablear el respaldo a iniciales cuando la imagen falla (D-D). No confiar en que el navegador muestre algo razonable.
- [ ] 2.5 Tests: con foto, sin foto, y con la foto fallando.

## 3. Cierre

- [ ] 3.1 Actualizar `docs/product-spec.md` en la sección de Configuración/perfil.
- [ ] 3.2 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 3.3 Verificar en el navegador con una cuenta de Google y otra de correo.
