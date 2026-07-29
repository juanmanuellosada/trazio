import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los enlaces de correo de Supabase local (confirmación, reset de
  // contraseña) usan 127.0.0.1; sin esto, la protección de cross-origin
  // requests de Next en modo dev los rechaza.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
