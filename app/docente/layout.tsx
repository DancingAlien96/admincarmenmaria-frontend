"use client";

import { Bell, ClipboardCheck, LayoutDashboard, Layers, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell, type ShellNavItem } from "@/components/app-shell";
import { PushBanner } from "@/components/push-toggle";

const NAV: ShellNavItem[] = [
  { href: "/docente", label: "Inicio", icon: LayoutDashboard },
  { href: "/docente/fases", label: "Fases", icon: Layers },
  { href: "/docente/calificaciones", label: "Calificaciones", icon: ClipboardCheck },
  { href: "/docente/avisos", label: "Avisos", icon: Bell },
];

export default function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Docentes (y admin para revisar) usan este portal.
  const allowed = user?.role === "DOCENTE" || user?.role === "ADMIN";

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "ESTUDIANTE") router.replace("/portal");
  }, [user, loading, router]);

  if (loading || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        Cargando…
      </div>
    );
  }

  return (
    <AppShell
      homeHref="/docente"
      brandSubtitle="Portal del Docente"
      groups={[{ items: NAV }]}
      footerLinks={
        user.role === "ADMIN"
          ? [{ href: "/panel", label: "Volver al panel", icon: Undo2 }]
          : []
      }
      user={{
        name: user.name,
        subtitle: user.role === "ADMIN" ? "Administrador" : "Catedrático",
      }}
      helpText="Para dudas sobre tus grupos, el contenido de las fases o el acceso al sistema, comunícate con la administración."
      onLogout={() => void logout()}
    >
      {user.role === "DOCENTE" && pathname.replace(/\/$/, "") === "/docente" && <PushBanner href="/docente/avisos/#activar" />}
      {children}
    </AppShell>
  );
}
