import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trazio",
  description: "Gestor de tareas personal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trazio",
  },
};

// `theme_color` fuera de `metadata` (API separada desde Next 14): mismo azul
// de marca que declara `app/manifest.ts`.
export const viewport: Viewport = {
  themeColor: "#283B56",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Sin lectura de servidor acá (bloque 5.5): eso forzaría render dinámico en
  // toda la app, incluida la landing pública. `next-themes` evita el
  // parpadeo por su cuenta con un script bloqueante que aplica la clase
  // antes del primer pintado, usando `localStorage` o `prefers-color-scheme`
  // como fallback. `suppressHydrationWarning` sigue siendo necesario porque
  // ese script ajusta la clase en el cliente antes de hidratar. El área
  // privada (`app/(app)/layout.tsx`) sincroniza el tema guardado en
  // `user_preferences` aparte, ya que ese layout es dinámico de todas formas.
  return (
    <html lang="es-AR" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
