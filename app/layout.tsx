import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { PwaSupport } from "@/components/pwa";

export const metadata: Metadata = {
  title: "Sistema Administrativo · Carmen María",
  description:
    "Sistema administrativo de la Escuela de Enfermería Carmen María",
  // App instalable en iPhone (Agregar a inicio)
  appleWebApp: {
    capable: true,
    title: "Carmen María",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#16314f",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
        <PwaSupport />
      </body>
    </html>
  );
}
