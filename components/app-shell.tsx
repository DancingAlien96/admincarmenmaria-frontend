"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Marco común de todo el sistema (panel, portal del docente y del alumno):
// menú lateral blanco fijo a la altura completa, contraíble a solo íconos,
// con tarjeta del usuario, y encabezado con el título de la página.

export interface ShellNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number; // contador rojo (p. ej. notificaciones)
}

export interface ShellNavGroup {
  title?: string; // p. ej. "Administración"
  items: ShellNavItem[];
}

export interface ShellUser {
  name: string;
  subtitle: string; // p. ej. "Exp. AE-2025-0147" o "Administrador"
  photoUrl?: string | null;
  badges?: { label: string; tone: "brand" | "gray" }[];
}

// Se recuerda si el menú está contraído (la misma preferencia en todo el sistema)
const COLLAPSE_KEY = "cm-sidebar-collapsed";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function AppShell({
  homeHref,
  brandSubtitle,
  groups,
  footerLinks = [],
  user,
  title,
  headerActions,
  helpText,
  onLogout,
  children,
}: {
  homeHref: string;
  brandSubtitle: string;
  groups: ShellNavGroup[];
  footerLinks?: ShellNavItem[];
  user: ShellUser;
  title?: string; // si no se indica, se toma de la opción activa del menú
  headerActions?: React.ReactNode;
  helpText: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [mini, setMini] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Cierra el cajón y la ayuda al navegar (en móvil)
  useEffect(() => {
    setOpen(false);
    setHelp(false);
  }, [pathname]);

  // Evita el scroll del fondo cuando el cajón está abierto en móvil
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function toggleMini() {
    const v = !mini;
    setMini(v);
    try {
      localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
    } catch {
      /* sin almacenamiento */
    }
  }

  const path = pathname.replace(/\/$/, "") || "/";
  const isActive = (href: string) =>
    href === homeHref ? path === homeHref : path === href || path.startsWith(href + "/");

  // Título: el de la opción activa más específica del menú
  const all = [...groups.flatMap((g) => g.items), ...footerLinks];
  const activo = all
    .filter((i) => isActive(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const pageTitle = title ?? activo?.label ?? "";

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
      mini ? "lg:justify-center" : ""
    } ${
      active
        ? "bg-brand-50 font-medium text-brand-700"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
    }`;
  const hideMini = mini ? "lg:hidden" : "";

  function navLink(item: ShellNavItem) {
    const Icon = item.icon;
    const badge = item.badge ?? 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={mini ? item.label : undefined}
        className={itemClass(isActive(item.href))}
      >
        <span className="relative">
          <Icon aria-hidden className="h-[18px] w-[18px]" />
          {badge > 0 && mini && (
            <span className="absolute -right-1.5 -top-1.5 hidden h-2 w-2 rounded-full bg-red-500 lg:block" />
          )}
        </span>
        <span className={`flex-1 ${hideMini}`}>{item.label}</span>
        {badge > 0 && (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white ${hideMini}`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Fondo oscuro al abrir el cajón en móvil */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Menú lateral fijo a la altura completa; cajón deslizable en móvil */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200",
          "lg:translate-x-0",
          mini ? "lg:w-20" : "lg:w-64",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Marca */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-4">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logocarmenmaria.png" alt="Carmen María" className="h-9 w-9 object-contain" />
            </span>
            <span className={`min-w-0 ${hideMini}`}>
              <span className="block truncate text-sm font-bold text-brand-800">
                Carmen María
              </span>
              <span className="block truncate text-xs text-gray-500">{brandSubtitle}</span>
            </span>
          </Link>
          <button
            onClick={toggleMini}
            aria-label={mini ? "Expandir menú" : "Contraer menú"}
            className="hidden shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block"
          >
            {mini ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tarjeta del usuario */}
        <div className="border-b border-gray-100 px-4 py-4">
          <div className={`flex items-center gap-3 ${mini ? "lg:justify-center" : ""}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(user.name)
              )}
            </span>
            <div className={`min-w-0 ${hideMini}`}>
              <p className="truncate text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="truncate text-xs text-gray-500">{user.subtitle}</p>
            </div>
          </div>
          {user.badges && user.badges.length > 0 && (
            <div className={`mt-2.5 flex flex-wrap gap-1.5 ${hideMini}`}>
              {user.badges.map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    b.tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {b.tone === "brand" && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g, gi) => (
            <div key={g.title ?? gi} className={gi > 0 ? "mt-4" : ""}>
              {g.title && (
                <p
                  className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${hideMini}`}
                >
                  {g.title}
                </p>
              )}
              {g.title && mini && <div className="mx-3 mb-2 hidden border-t border-gray-100 lg:block" />}
              <div className="space-y-1">
                {g.items.map(navLink)}
              </div>
            </div>
          ))}
        </nav>

        {/* Cuenta */}
        <div className="space-y-1 border-t border-gray-100 px-3 py-3">
          {footerLinks.map(navLink)}
          <button
            onClick={onLogout}
            title={mini ? "Cerrar sesión" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 ${
              mini ? "lg:justify-center" : ""
            }`}
          >
            <LogOut aria-hidden className="h-[18px] w-[18px]" />
            <span className={hideMini}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Columna principal (con margen para no quedar bajo el menú) */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-200 ${
          mini ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">{pageTitle}</h1>
            <p className="hidden truncate text-xs text-gray-500 sm:block">
              Escuela Privada de Auxiliares de Enfermería Carmen María
            </p>
          </div>
          {headerActions}
          <div className="relative">
            <button
              onClick={() => setHelp((v) => !v)}
              aria-label="Ayuda"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <CircleHelp className="h-5 w-5" />
            </button>
            {help && (
              <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-lg">
                <p className="font-semibold text-gray-800">¿Necesitas ayuda?</p>
                <p className="mt-1 text-gray-500">{helpText}</p>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
