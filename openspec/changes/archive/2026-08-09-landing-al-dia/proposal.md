## Why

La sección "Lo que viene" de la landing presenta como hoja de ruta futura cuatro
funciones (hábitos con rachas, filtros guardados, recordatorios, atajos de
teclado) que ya están construidas y en producción — le dice al visitante que el
producto tiene menos de lo que tiene. Además, hoy no se puede distinguir qué CTA
de la landing (hero, banda, cierre) generó una conversión, porque los tres
disparan el mismo evento `cta_click` sin ubicación.

## What Changes

- Eliminar la sección "Lo que viene" (`components/marketing/roadmap-section.tsx`)
  de la landing pública y de `app/(marketing)/page.tsx`.
- Actualizar `docs/landing.md` para que no describa una sección que ya no existe
  (y corregir la mención a Google Calendar, que también dejó de ser "lo que
  viene" hace tiempo).
- Añadir una propiedad de ubicación (`hero` | `banda` | `cierre`) al evento
  `cta_click` para poder distinguir los tres CTA de la landing en la analítica.
- **No se agrega medición nueva de registro.** El evento `registro_completado`
  ya existe, montado únicamente en `app/(auth)/registro/page.tsx`, y ya está
  contemplado por la política de privacidad — se documenta esto en `design.md`
  para que quede explícito por qué no hace falta tocarlo.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `landing-publica`: se elimina el requirement de la sección "Lo que viene".
  El requirement "Analítica acotada a cuatro métricas (G3)" no cambia: la
  ubicación del CTA es una propiedad del mismo evento `clics en el CTA`, ya
  contemplado, no una métrica nueva.

## Impact

- `components/marketing/roadmap-section.tsx` (se borra)
- `app/(marketing)/page.tsx` (deja de renderizar la sección)
- `components/marketing/cta-link.tsx`, `components/marketing/analytics-bridge.tsx`
  y los tres call sites del CTA (hero, banda, cierre)
- `docs/landing.md`
- `openspec/specs/landing-publica/spec.md` (vía delta de este change)
