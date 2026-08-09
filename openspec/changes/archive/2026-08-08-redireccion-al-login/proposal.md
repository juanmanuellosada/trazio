## Why

El arreglo de la expulsión por falla transitoria (commit `eff9371`) dejó dos
cabos sueltos, y uno de los dos es el que causó el bug original.

El spec dice que el middleware redirige "a cualquier visita **sin sesión**",
sin distinguir dos cosas que no son lo mismo: no tener sesión, y tenerla sin
poder verificarla en ese instante. Esa ambigüedad es exactamente la que el
código había resuelto mal durante meses. El código ya la resuelve bien; el
spec sigue sin decirlo, así que la próxima persona que lo lea puede
"corregir" el código hacia el bug.

Y el camino nuevo perdió el destino: cuando el proxy deja pasar y la página
tampoco puede verificar la sesión, el `redirect("/login")` de la página no
conserva a dónde ibas. El middleware sí lo conservaba. Es una regresión
chica, en un caso raro, pero es una promesa que el spec hace y que ese camino
no cumple.

## What Changes

- El spec SHALL distinguir explícitamente "sin sesión" de "sesión que no se
  pudo verificar ahora", y decir qué pasa en cada caso: la primera redirige,
  la segunda pasa.
- Los `redirect("/login")` de las páginas protegidas SHALL conservar el
  destino original, igual que ya lo hace el middleware.

No hay cambio de comportamiento en el middleware: ya se comporta así desde
`eff9371`. Lo que cambia es que el spec lo dice, y que el camino de respaldo
deja de perder el destino.

## Capabilities

### Modified Capabilities

- `autenticacion`: el requisito del middleware distingue los dos casos, y la
  conservación del destino pasa a valer para todos los caminos que mandan al
  login, no solo el del middleware.

## Impact

**Middleware** — SÍ cambia, al contrario de lo que decía la primera versión de
esta propuesta: tiene que inyectar el pathname como header. Un Server
Component no puede leer la URL actual —limitación documentada de Next.js— y el
`redirect` que de verdad se ejecuta vive en `app/(app)/layout.tsx`, que
envuelve las 13 rutas y gana sobre el de cada página. Sin ese header, el
layout no tiene forma de saber a dónde ibas.

La **lógica de decisión** de `lib/supabase/proxy.ts` no cambia: ya distingue
"sin cookies" de "verificación fallida". Se le suma un header, no se le toca
el criterio.

**Interfaz** — el `redirect` de `app/(app)/layout.tsx`, que es el que importa,
y los de las cuatro páginas de ruta fija, que hoy no llegan a ejecutarse pero
tienen que quedar consistentes.

**Fuera de alcance** — achicar el matcher del proxy para que el refresh no
corra en `/api`, el service worker ni los prefetches de RSC. Ataca la otra
causa posible (la carrera de rotación de tokens) y tiene su propio riesgo:
excluir `/api` deja a las rutas de API sin el refresco del proxy. Va aparte.
También queda afuera el desalineamiento entre el apex y `www`.
