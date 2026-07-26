"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Sin esto, sonner pinta sus toasts con un rojo propio (no el
          // `--error` de docs/design-system.md §7, ya elegido para no ser
          // el rojo de marca `#EC1E2A` — decisión D5). Success/warning/info
          // también se pisan por consistencia con el resto de la app.
          "--success-bg": "var(--success)",
          "--success-border": "var(--success)",
          "--success-text": "var(--success-foreground)",
          "--warning-bg": "var(--warning)",
          "--warning-border": "var(--warning)",
          "--warning-text": "var(--warning-foreground)",
          "--error-bg": "var(--error)",
          "--error-border": "var(--error)",
          "--error-text": "var(--error-foreground)",
          "--info-bg": "var(--info)",
          "--info-border": "var(--info)",
          "--info-text": "var(--info-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
