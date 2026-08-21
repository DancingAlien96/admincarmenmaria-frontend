"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/pagos", label: "Pagos" },
  { href: "/portal/documentos", label: "Documentación" },
  { href: "/portal/ebooks", label: "Biblioteca" },
  { href: "/portal/notificaciones", label: "Notificaciones" },
  { href: "/portal/cuenta", label: "Cambiar contraseña" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    // Solo estudiantes usan el portal; el resto va al panel.
    else if (user.role !== "ESTUDIANTE") router.replace("/panel");
  }, [user, loading, router]);

  // Conteo de notificaciones para el badge del menú.
  useEffect(() => {
    if (user?.role !== "ESTUDIANTE") return;
    api<{ total: number }>("/api/portal/notificaciones")
      .then((r) => setNotifCount(r.total))
      .catch(() => setNotifCount(0));
  }, [user?.role, pathname]);

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

  if (loading || !user || user.role !== "ESTUDIANTE") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
        <span className="text-sm font-semibold">Portal · Carmen María</span>
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
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logocarmenmaria.png"
                alt="Carmen María"
                className="h-9 w-9 object-contain"
              />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-800">Carmen María</p>
              <p className="text-xs text-gray-500">Portal del Estudiante</p>
            </div>
          </div>
          {/* Botón cerrar (solo móvil) */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-4">
          <p className="truncate text-sm font-semibold text-gray-800">
            {user.name}
          </p>
          <p className="text-xs text-gray-400">Estudiante</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{item.label}</span>
                {item.href === "/portal/notificaciones" && notifCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                    {notifCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 px-3 py-4">
          <button
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-x-hidden pt-14 lg:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
