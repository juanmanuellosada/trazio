## Context

`lib/supabase/proxy.ts` decide desde `eff9371` por presencia de las cookies
`sb-<ref>-auth-token`: sin cookies redirige, con cookies y verificación
fallida deja pasar. Un test cubre los tres caminos
(`lib/supabase/proxy.test.ts`).

Las 13 páginas bajo `app/(app)/` llaman a `getCurrentUser()` y, si devuelve
`null`, hacen `redirect("/login")` o `notFound()`. Ese es el camino de
respaldo que el arreglo del proxy activó: antes casi nunca se alcanzaba,
porque el middleware expulsaba primero.

## Goals / Non-Goals

**Goals:** que el spec afirme la distinción que el código ya hace, y que
ningún camino al login pierda el destino.

**Non-Goals:** cambiar la *lógica de decisión* del middleware, achicar el matcher,
el apex contra `www`, y el `notFound()` de las rutas con parámetro — un 404
no es un camino al login y no tiene destino que conservar.

## Decisions

### D-A — El spec nombra los dos casos, no uno

La redacción actual —"cualquier visita sin sesión"— es verdadera y
insuficiente. No es falsa: una visita sin sesión sí redirige. El problema es
que no dice nada del caso que importa, y el silencio se leyó como "cualquier
cosa que no sea una sesión confirmada".

El spec pasa a nombrar los dos:

- Sin cookies de sesión → redirige.
- Con cookies, verificación no confirmada → **pasa**, y la página resuelve.

Y dice por qué, porque el "por qué" es lo que impide que alguien lo
simplifique de vuelta: una falla de red contra el proveedor de identidad no
es una persona sin sesión, y tratarlas igual expulsa a alguien con la sesión
viva.

### D-B — Conservar el destino es del camino, no del middleware

El spec hoy le pide la conservación del destino al middleware, que es donde
estaba implementada. Pasa a ser una propiedad de **cualquier** redirección al
login: quien mande a alguien a loguearse tiene que decir a dónde iba.

Así el requisito deja de describir un archivo y pasa a describir el
comportamiento, que es lo que un spec tiene que hacer. Y cubre de una el
camino de respaldo que hoy lo pierde.

### D-C — El middleware inyecta el pathname, porque no hay otra forma

La primera versión de este diseño daba por hecho que bastaba con tocar los
`redirect` de las páginas. Es falso, y el intento de implementarlo lo demostró:

- **Un Server Component no puede leer la URL actual.** Es una limitación
  documentada de Next.js, comprobada volcando `headers()` desde una ruta de
  diagnóstico: no hay pathname en ningún header.
- **El `redirect` que se ejecuta es el de `app/(app)/layout.tsx`**, que envuelve
  las 13 rutas. Se comprobó marcando el `redirect` de una página y viendo que la
  respuesta real nunca lleva esa marca: el del layout gana siempre. Arreglar solo
  las páginas habría sido cosmético — verde en los tests, sin cambio en el
  navegador.

Así que el middleware inyecta el pathname como header y el layout lo lee: es el
patrón sancionado de Next.js para exactamente este problema.

**Por qué no se saca el check del layout:** no es un resguardo, aunque su
comentario lo diga. Usa `user.id` en seis consultas para armar el panel lateral,
así que necesita la sesión antes de que corra la página. Moverlo sería un cambio
de arquitectura para resolver un `?next=`.

## Risks / Trade-offs

**[Tocar 13 páginas para un caso raro]** → El cambio es idéntico en todas y
mecánico. El riesgo real es olvidarse de una, y eso se cubre con un test que
recorra las rutas protegidas en vez de con uno por página.

**[El `notFound()` queda distinto]** → A propósito. Una ruta con parámetro
inválido devuelve 404, no manda al login, y no hay destino que conservar. Si
en el futuro alguien unifica los dos caminos, que sea una decisión y no un
descuido: queda escrito acá.
