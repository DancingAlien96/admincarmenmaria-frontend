"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TEACHER_ROLE_LABELS } from "@/lib/labels";
import type { Pagination, TeacherListItem, TeacherRole } from "@/lib/types";

const ROLES: (TeacherRole | "")[] = [
  "",
  "PRACTICA_HOSPITALARIA",
  "PRACTICA_COMUNITARIA",
  "TEORIA",
];

export default function TeachersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<TeacherRole | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TeacherListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      params.set("page", String(page));
      const res = await api<{ data: TeacherListItem[]; pagination: Pagination }>(
        `/api/teachers?${params.toString()}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Catedráticos</h1>
          <p className="text-sm text-gray-500">
            {pagination?.total ?? 0} catedráticos registrados
          </p>
        </div>
        <Link
          href="/panel/catedraticos/nuevo"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo catedrático
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Buscar por nombre, DPI o especialidad…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as TeacherRole | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r ? TEACHER_ROLE_LABELS[r] : "Todos los roles"}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Especialidad</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No hay catedráticos que coincidan.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className={t.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/catedraticos/detalle?id=${t.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {t.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <RoleChips roles={t.roles} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.specialty ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{t._count.documents}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-gray-400">
            No hay catedráticos que coincidan.
          </p>
        ) : (
          items.map((t) => (
            <Link
              key={t.id}
              href={`/panel/catedraticos/detalle?id=${t.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4"
            >
              <p className="font-medium text-brand-700">{t.fullName}</p>
              <div className="mt-2">
                <RoleChips roles={t.roles} />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {t.specialty ?? "Sin especialidad"} · {t.phone ?? "sin tel."}
              </p>
            </Link>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleChips({ roles }: { roles: TeacherRole[] }) {
  if (roles.length === 0)
    return <span className="text-xs text-gray-400">Sin rol</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800"
        >
          {TEACHER_ROLE_LABELS[r]}
        </span>
      ))}
    </div>
  );
}
