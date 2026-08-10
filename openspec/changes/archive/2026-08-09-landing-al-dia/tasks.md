## 1. Sacar la sección de roadmap

- [x] 1.1 Quitar `<RoadmapSection />` de `app/(marketing)/page.tsx` y su import
- [x] 1.2 Borrar `components/marketing/roadmap-section.tsx`
- [x] 1.3 Confirmar que no queda nada huérfano (imports sin usar, datos en
      `lib/landing/` que solo usara esa sección, estilos muertos)
- [x] 1.4 Actualizar `docs/landing.md` (§7 y la mención a Google Calendar como
      futuro) para que no describa la sección eliminada
- [x] 1.5 Verificar en el navegador que la landing queda bien sin la sección
      (sin hueco de espaciado raro entre las secciones vecinas)

## 2. Distinguir los tres CTA en la analítica

- [x] 2.1 Agregar prop `location` (`"hero" | "banda" | "cierre"`) a
      `components/marketing/cta-link.tsx` y componer
      `data-analytics-event="cta_click_<location>"` con ella
- [x] 2.2 Actualizar los tres call sites del CTA (hero, banda, cierre) para
      pasar su `location`
- [x] 2.3 Verificar que `components/marketing/analytics-bridge.tsx` no
      necesita cambios (sigue reenviando `data-analytics-event` tal cual)

## 3. Spec y documentación

- [x] 3.1 Aplicar el delta de `specs/landing-publica/spec.md` de este change
      (elimina el requirement de "Lo que viene") al archivar el change
- [x] 3.2 Correr `openspec validate --changes --strict`

## 4. Cierre

- [x] 4.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 4.2 Archivar el change con `/opsx:archive landing-al-dia`
