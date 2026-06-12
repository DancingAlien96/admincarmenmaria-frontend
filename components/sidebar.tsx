"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { ModuleSection } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  section?: ModuleSection;
  ready: boolean;
}

const NAV: NavItem[] = [
  { href: "/panel", label: "Inicio", ready: true },
  { href: "/panel/estudiantes", label: "Expedientes", section: "STUDENTS", ready: true },
  { href: "/panel/pagos", label: "Control de Pagos", section: "PAYMENTS", ready: true },
  { href: "/panel/recordatorios", label: "Recordatorios", section: "REMINDERS", ready: true },
  { href: "/panel/dashboard", label: "Dashboard Financiero", section: "DASHBOARD", ready: true },
  { href: "/panel/diplomas", label: "Banca de Diplomas", section: "DIPLOMAS", ready: true },
  { href: "/panel/actas", label: "Gestión de Actas", section: "ACTAS", ready: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el cajón al navegar (en móvil)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Evita el scroll del fondo cuando el cajón está abierto en móvil
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const visible = NAV.filter(
    (item) => !item.section || canAccess(user, item.section)
  );

  return (
    <>
      {/* Barra superior móvil con botón hamburguesa */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-brand-800 px-4 text-white lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg p-1.5 hover:bg-white/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logocarmenmaria.png"
            alt="Logo Carmen María"
            className="h-7 w-7 object-contain"
          />
        </span>
        <span className="text-sm font-semibold">Carmen María</span>
      </header>

      {/* Fondo oscuro al abrir el cajón en móvil */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar: fijo en escritorio, cajón deslizable en móvil */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-brand-800 text-white transition-transform duration-200",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logocarmenmaria.png"
                alt="Logo Carmen María"
                className="h-10 w-10 object-contain"
              />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Carmen María</p>
              <p className="text-xs text-brand-100/70">Sistema Administrativo</p>
            </div>
          </div>
          {/* Botón cerrar (solo móvil) */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1 hover:bg-white/10 lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visible.map((item) => {
            const active =
              item.href === "/panel"
                ? pathname === "/panel"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.ready ? item.href : "#"}
                aria-disabled={!item.ready}
                className={[
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-white/15 font-medium"
                    : "text-brand-100/80 hover:bg-white/10",
                  !item.ready ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
                onClick={(e) => {
                  if (!item.ready) e.preventDefault();
                }}
              >
                <span>{item.label}</span>
                {!item.ready && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                    Pronto
                  </span>
                )}
              </Link>
            );
          })}

          {user?.role === "ADMIN" && (
            <>
              <Link
                href="/panel/catedraticos"
                className={[
                  "mt-2 flex items-center rounded-lg px-3 py-2 text-sm transition",
                  pathname.startsWith("/panel/catedraticos")
                    ? "bg-white/15 font-medium"
                    : "text-brand-100/80 hover:bg-white/10",
                ].join(" ")}
              >
                Catedráticos
              </Link>
              <Link
                href="/panel/usuarios"
                className={[
                  "flex items-center rounded-lg px-3 py-2 text-sm transition",
                  pathname.startsWith("/panel/usuarios")
                    ? "bg-white/15 font-medium"
                    : "text-brand-100/80 hover:bg-white/10",
                ].join(" ")}
              >
                Usuarios y permisos
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-brand-100/60">
            {user?.role === "ADMIN" ? "Administrador" : "Personal"}
          </p>
          <button
            onClick={() => void logout()}
            className="mt-3 w-full rounded-lg bg-white/10 py-2 text-sm transition hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
