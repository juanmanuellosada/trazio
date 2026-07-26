/**
 * Banner de error de autenticación, de tres partes (`.claude/rules/copy.md`).
 * Usa `--error`, nunca el rojo de marca `#EC1E2A` (D5): acá ese rojo
 * significa prioridad Urgente, no un formulario que falló.
 */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
      {message}
    </div>
  );
}
