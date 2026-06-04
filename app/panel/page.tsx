"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { ModuleSection } from "@/lib/types";

interface ModuleCard {
  href: string;
  title: string;
  description: string;
  section: ModuleSection;
  ready: boolean;
}

const MODULES: ModuleCard[] = [
  {
    href: "/panel/estudiantes",
    title: "Expedientes",
    description: "Datos, documentos y estados de cada estudiante.",
    section: "STUDENTS",
    ready: true,
  },
  {
    href: "/panel/pagos",
    title: "Control de Pagos",
    description: "Cuotas, comprobantes y pagos (WooCommerce + manuales).",
    section: "PAYMENTS",
    ready: true,
  },
  {
    href: "/panel/recordatorios",
    title: "Recordatorios",
    description: "Bot de WhatsApp y notificaciones automáticas de colegiatura.",
    section: "REMINDERS",
    ready: true,
  },
  {
    href: "/panel/dashboard",
    title: "Dashboard Financiero",
    description: "Ingresos, egresos, mora y reportes exportables.",
    section: "DASHBOARD",
    ready: true,
  },
  {
    href: "/panel/diplomas",
    title: "Banca de Diplomas",
    description: "Egresados, diplomas y cartas de recomendación.",
    section: "DIPLOMAS",
    ready: true,
  },
  {
    href: "/panel/actas",
    title: "Gestión de Actas",
    description: "Actas de calificaciones con plantilla y envío automático.",
    section: "ACTAS",
    ready: true,
  },
];

export default function PanelHome() {
  const { user } = useAuth();
  const available = MODULES.filter((m) => canAccess(user, m.section));

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-800">
        Hola, {user?.name?.split(" ")[0]}
      </h1>
      <p className="mt-1 text-gray-500">
        Bienvenido al sistema administrativo. Selecciona un módulo para empezar.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((m) => {
          const card = (
            <div
              className={[
                "h-full rounded-xl border bg-white p-5 shadow-sm transition",
                m.ready
                  ? "border-gray-200 hover:border-brand-300 hover:shadow-md"
                  : "border-dashed border-gray-200 opacity-70",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-brand-800">{m.title}</h2>
                {!m.ready && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    Próximamente
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">{m.description}</p>
            </div>
          );
          return m.ready ? (
            <Link key={m.href} href={m.href}>
              {card}
            </Link>
          ) : (
            <div key={m.href}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
