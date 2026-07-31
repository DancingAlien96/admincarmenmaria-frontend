"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/pagos", label: "Pagos" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    // Solo estudiantes usan el portal; el resto va al panel.
    else if (user.role !== "ESTUDIANTE") router.replace("/panel");
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ESTUDIANTE") {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Barra lateral */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-brand-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logocarmenmaria.png" alt="Carmen María" className="h-9 w-9 object-contain" />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-800">Carmen María</p>
            <p className="text-xs text-gray-500">Portal del Estudiante</p>
          </div>
        </div>

        <div className="border-b border-gray-100 px-5 py-4">
          <p className="truncate text-sm font-semibold text-gray-800">
            {user.name}
          </p>
          <p className="text-xs text-gray-400">Estudiante</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
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
      <div className="flex-1">
        {/* Barra superior (móvil): navegación simple */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <span className="font-bold text-brand-800">Portal · Carmen María</span>
          <button
            onClick={() => void logout()}
            className="text-sm text-brand-600"
          >
            Salir
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
