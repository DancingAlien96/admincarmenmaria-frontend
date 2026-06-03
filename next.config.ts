import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exportacion estatica: genera /out con HTML/CSS/JS para servir con Nginx.
  output: "export",
  // En export estatico no hay optimizador de imagenes en servidor.
  images: { unoptimized: true },
  // Emite /ruta/index.html para que Nginx sirva rutas limpias sin config extra.
  trailingSlash: true,
};

export default nextConfig;
