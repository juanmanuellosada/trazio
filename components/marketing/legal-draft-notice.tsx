/**
 * Aviso obligatorio en términos y privacidad (bloque 12.9, decisión D20):
 * el texto es un borrador técnico de `docs/legales.md`, no un texto legal
 * aprobado. La implementación no redacta contenido legal propio ni de
 * relleno — solo maqueta lo que el dueño del proyecto proveyó como insumo,
 * y deja explícito acá que falta su aprobación antes de producción.
 */
export function LegalDraftNotice() {
  return (
    <div className="mb-8 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">Este texto está pendiente de aprobación.</p>
      <p className="mt-1 text-text-secondary">
        Es un borrador técnico, no un texto legal: lo redactó un agente a partir del código y los
        documentos del producto, y todavía no lo revisó nadie con formación legal. Esta página no
        debería publicarse en producción hasta contar con el texto definitivo.
      </p>
    </div>
  );
}
