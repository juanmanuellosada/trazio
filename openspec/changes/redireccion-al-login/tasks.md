## 1. Destino conservado

- [x] 1.1 Hacer que los `redirect("/login")` de las páginas bajo `app/(app)/**` conserven el destino original, con el mismo formato de parámetro que ya usa el middleware.
- [x] 1.2 Dejar los `notFound()` como están: un 404 no es un camino al login (D-B).
- [x] 1.3 Un test que recorra las rutas protegidas y afirme que todas las que terminan en el login conservaron el destino. Un test por página no sirve: el riesgo es olvidarse de una, y eso solo lo detecta un recorrido.

## 2. Spec

- [x] 2.1 Verificar que `lib/supabase/proxy.ts` ya cumple el requisito modificado sin cambios. Si hiciera falta tocarlo, PARAR: significa que el spec quedó describiendo algo distinto de lo que se desplegó y hay que revisarlo antes.

## 3. Cierre

- [x] 3.1 `pnpm lint && pnpm typecheck && pnpm test` en verde.
- [ ] 3.2 Verificar en el navegador: entrar sin sesión a una ruta profunda y confirmar que después de loguearte volvés ahí y no a la bandeja.

## 4. Pathname en el layout (agregado tras el bloqueo)

- [x] 4.1 Inyectar el pathname como header desde el middleware (D-C). Sin tocar la lógica de decisión cookies-presentes/ausentes de `lib/supabase/proxy.ts`.
- [x] 4.2 Leerlo en `app/(app)/layout.tsx` con `headers()` y conservar el destino en su `redirect("/login")`. Es el redirect que de verdad se ejecuta.
- [x] 4.3 Corregir el comentario de `app/(app)/layout.tsx` que llama "resguardo" a ese check: usa `user.id` en seis consultas y es el que gana sobre el de cada página.
- [x] 4.4 Que el test de recorrido (1.3) cubra el camino del layout, no solo el de las páginas. Un test que solo cubra las páginas queda en verde sin probar nada.
