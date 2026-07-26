"use client";

import { useEffect, useState } from "react";

/** Señal 1 de D4 (`lib/realtime/connectivity.ts`): `navigator.onLine`, sin polling. */
export function useNavigatorOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
