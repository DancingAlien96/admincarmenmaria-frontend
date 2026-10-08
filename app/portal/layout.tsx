"use client";

import {
  Bell,
  BookOpen,
  CircleDollarSign,
  Folder,
  KeyRound,
  LayoutDashboard,
  Layers,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { STATUS_LABELS } from "@/lib/labels";
import { AppShell, type ShellNavItem } from "@/components/app-shell";
import { PortalMeContext } from "@/components/portal-context";
import type { PortalMe } from "@/lib/types";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<PortalMe | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    // Solo estudiantes usan el portal; el resto va al panel.
    else if (user.role !== "ESTUDIANTE") router.replace("/panel");
  }, [user, loading, router]);

  const reload = useCallback(async () => {
    try {
      setMe(await api<PortalMe>("/api/portal/me"));
    } catch {
      /* el portal sigue funcionando sin la tarjeta del alumno */
    }
  }, []);

  // Datos del alumno (y conteo de notificaciones) al navegar
  useEffect(() => {
    if (user?.role !== "ESTUDIANTE") return;
    void reload();
  }, [user?.role, pathname, reload]);

  if (loading || !user || user.role !== "ESTUDIANTE") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        Cargando…
      </div>
    );
  }

  const esAspirante =
    user.studentStatus === "ASPIRANTE" || user.studentStatus === "NO_ADMITIDO";
  const notifCount = me?.notifCount ?? 0;
  const s = me?.student;

  const nav: ShellNavItem[] = esAspirante
    ? [
        { href: "/portal", label: "Mi solicitud", icon: LayoutDashboard },
        { href: "/portal/ebooks", label: "Material de estudio", icon: BookOpen },
        { href: "/portal/pagos", label: "Pagos", icon: CircleDollarSign },
        { href: "/portal/documentos", label: "Documentación", icon: Folder },
      ]
    : [
        { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
        { href: "/portal/fases", label: "Fases", icon: Layers },
        { href: "/portal/pagos", label: "Pagos", icon: CircleDollarSign },
        { href: "/portal/documentos", label: "Documentación", icon: Folder },
        { href: "/portal/ebooks", label: "E-Books", icon: BookOpen },
        { href: "/portal/notificaciones", label: "Notificaciones", icon: Bell, badge: notifCount },
      ];

  const path = pathname.replace(/\/$/, "");
  const title =
    path === "/portal" ? (esAspirante ? "Mi solicitud" : "Portal Alumno") : undefined;

  return (
    <PortalMeContext.Provider value={{ me, reload }}>
      <AppShell
        homeHref="/portal"
        brandSubtitle="Portal del Estudiante"
        groups={[{ items: nav }]}
        footerLinks={[{ href: "/portal/cuenta", label: "Cambiar contraseña", icon: KeyRound }]}
        user={{
          name: s?.fullName ?? user.name,
          subtitle: s?.expedienteNumber ? `Exp. ${s.expedienteNumber}` : "Estudiante",
          photoUrl: s?.photoUrl,
          badges: s
            ? [
                ...(s.sede ? [{ label: s.sede, tone: "brand" as const }] : []),
                { label: STATUS_LABELS[s.status], tone: "gray" as const },
              ]
            : [],
        }}
        title={title}
        headerActions={
          !esAspirante && (
            <Link
              href="/portal/notificaciones"
              aria-label="Notificaciones"
              className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>
          )
        }
        helpText="Comunícate con la administración de la escuela para dudas sobre pagos, documentos o tus fases."
        onLogout={() => void logout()}
      >
        {children}
      </AppShell>
    </PortalMeContext.Provider>
  );
}
