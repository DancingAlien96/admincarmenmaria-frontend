"use client";

import {
  BellRing,
  BookOpen,
  CalendarRange,
  ChartColumn,
  CircleDollarSign,
  Contact,
  FileChartColumn,
  FilePen,
  FolderCheck,
  GraduationCap,
  LayoutDashboard,
  Layers,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import { AppShell, type ShellNavGroup, type ShellNavItem } from "@/components/app-shell";
import type { ModuleSection } from "@/lib/types";

// Módulos del panel; cada uno visible según los permisos del usuario.
const MODULOS: (ShellNavItem & { section?: ModuleSection })[] = [
  { href: "/panel", label: "Inicio", icon: LayoutDashboard },
  { href: "/panel/estudiantes", label: "Expedientes", icon: Users, section: "STUDENTS" },
  { href: "/panel/pagos", label: "Control de Pagos", icon: CircleDollarSign, section: "PAYMENTS" },
  { href: "/panel/recordatorios", label: "Recordatorios", icon: BellRing, section: "REMINDERS" },
  { href: "/panel/dashboard", label: "Dashboard Financiero", icon: ChartColumn, section: "DASHBOARD" },
  { href: "/panel/reportes", label: "Reportes", icon: FileChartColumn, section: "DASHBOARD" },
  { href: "/panel/diplomas", label: "Banca de Diplomas", icon: GraduationCap, section: "DIPLOMAS" },
  { href: "/panel/actas", label: "Gestión de Actas", icon: FilePen, section: "ACTAS" },
];

// Configuración (solo administrador)
const ADMINISTRACION: ShellNavItem[] = [
  { href: "/panel/catedraticos", label: "Catedráticos", icon: Contact },
  { href: "/panel/usuarios", label: "Usuarios y permisos", icon: UserCog },
  { href: "/panel/documentos-requeridos", label: "Documentos requeridos", icon: FolderCheck },
  { href: "/panel/fases", label: "Gestión de Fases", icon: Layers },
  { href: "/panel/plan-cuotas", label: "Plan de cuotas", icon: CalendarRange },
  { href: "/panel/ebooks", label: "Biblioteca (E-Books)", icon: BookOpen },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    // Un estudiante no accede al panel administrativo; va a su portal.
    else if (user.role === "ESTUDIANTE") router.replace("/portal");
    // Un docente va a su propio portal.
    else if (user.role === "DOCENTE") router.replace("/docente");
  }, [user, loading, router]);

  if (loading || !user || user.role === "ESTUDIANTE" || user.role === "DOCENTE") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        Cargando…
      </div>
    );
  }

  const esAdmin = user.role === "ADMIN";
  const groups: ShellNavGroup[] = [
    { items: MODULOS.filter((m) => !m.section || canAccess(user, m.section)) },
    ...(esAdmin ? [{ title: "Administración", items: ADMINISTRACION }] : []),
  ];

  return (
    <AppShell
      homeHref="/panel"
      brandSubtitle="Sistema Administrativo"
      groups={groups}
      user={{ name: user.name, subtitle: esAdmin ? "Administrador" : "Personal" }}
      helpText="Si algo no funciona como esperas o necesitas acceso a otro módulo, comunícate con el administrador del sistema."
      onLogout={() => void logout()}
    >
      {children}
    </AppShell>
  );
}
