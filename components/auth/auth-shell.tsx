import type { ReactNode } from "react";

/**
 * Layout compartido por las cuatro pantallas de auth: columna centrada,
 * móvil primero, con el título como jerarquía principal (Flat Design,
 * `docs/design-system.md`). Es Server Component: no tiene estado propio.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="text-center text-sm text-text-secondary">{footer}</div> : null}
      </div>
    </div>
  );
}
