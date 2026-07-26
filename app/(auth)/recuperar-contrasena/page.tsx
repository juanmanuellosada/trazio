import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecuperarContrasenaForm } from "./recuperar-contrasena-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña — Trazio",
};

export default function RecuperarContrasenaPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te mandamos un enlace para elegir una nueva."
      footer={
        <>
          ¿Te acordaste?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciá sesión
          </Link>
        </>
      }
    >
      <RecuperarContrasenaForm />
    </AuthShell>
  );
}
