import type { MetadataRoute } from "next";

// Se genera como archivo estático (output: "export")
export const dynamic = "force-static";

// Manifest de la PWA: permite instalar el Campus en iPhone y Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campus · Enfermería Carmen María",
    short_name: "Carmen María",
    description:
      "Campus y sistema administrativo de la Escuela de Enfermería Carmen María",
    lang: "es",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#16314f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
