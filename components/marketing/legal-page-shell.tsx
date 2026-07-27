import type { ReactNode } from "react";
import { LegalDraftNotice } from "./legal-draft-notice";

/** Envoltorio tipográfico compartido por `/terminos` y `/privacidad` (bloque 12.9). */
export function LegalPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <LegalDraftNotice />
      <div
        className="space-y-4 text-sm leading-relaxed text-text-secondary
          [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground
          [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground
          [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_table]:w-full [&_table]:border-collapse [&_table]:text-left
          [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-foreground
          [&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top"
      >
        {children}
      </div>
    </div>
  );
}
