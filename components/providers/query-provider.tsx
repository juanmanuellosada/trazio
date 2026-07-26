"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * `QueryClientProvider` de TanStack Query para `app/(app)/**` (bloque 5).
 * Uno por sesión de navegador (`useState` con inicializador), no uno nuevo
 * en cada render.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
