"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { ActaListItem, Pagination } from "@/lib/types";

export default function ActasPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "ACTAS", "EDITOR");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ActaListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await api<{ data: ActaListItem[]; pagination: Pagination }>(
        `/api/actas?${params.toString()}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta acta?")) return;
    await api(`/api/actas/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Gestión de Actas
          </h1>
          <p className="text-sm text-gray-500">
            {pagination?.total ?? 0} actas de calificaciones
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/panel/actas/inauguracion"
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Actas de inauguración
          </Link>
          {canEdit && (
            <Link
              href="/panel/actas/nueva"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Nueva acta
            </Link>
          )}
        </div>
      </div>

      <input
        placeholder="Buscar por número de acta o fase…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">No. Acta</th>
              <th className="px-4 py-3">Fase</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Folios</th>
              <th className="px-4 py-3">Alumnos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hay actas registradas.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/actas/detalle?id=${a.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {a.actaNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.phase}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.actaDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.folios ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a._count.entries}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`${apiUrl}/api/actas/${a.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        PDF
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => void remove(a.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
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
            No hay actas registradas.
          </p>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/panel/actas/detalle?id=${a.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Acta {a.actaNumber}
                </Link>
                <span className="shrink-0 text-xs text-gray-400">
                  {a.actaDate.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{a.phase}</p>
              <p className="mt-1 text-xs text-gray-500">
                Folios: {a.folios ?? "—"} · {a._count.entries} alumnos
              </p>
              <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3">
                <a
                  href={`${apiUrl}/api/actas/${a.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  PDF
                </a>
                {canEdit && (
                  <button
                    onClick={() => void remove(a.id)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
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
