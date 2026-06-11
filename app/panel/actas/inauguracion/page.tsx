"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { InauguracionListItem, Pagination } from "@/lib/types";

export default function InauguracionListPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "ACTAS", "EDITOR");

  const [items, setItems] = useState<InauguracionListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{
        data: InauguracionListItem[];
        pagination: Pagination;
      }>(`/api/inauguracion?page=${page}`);
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta acta de inauguración?")) return;
    await api(`/api/inauguracion/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <Link href="/panel/actas" className="text-sm text-brand-600 hover:underline">
        ← Volver a actas
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Actas de inauguración
          </h1>
          <p className="text-sm text-gray-500">
            {pagination?.total ?? 0} actas registradas
          </p>
        </div>
        {canEdit && (
          <Link
            href="/panel/actas/inauguracion/nueva"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nueva acta de inauguración
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">No. Acta</th>
              <th className="px-4 py-3">Promoción</th>
              <th className="px-4 py-3">Cohorte</th>
              <th className="px-4 py-3">Fecha del acto</th>
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
                  No hay actas de inauguración.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {a.actaNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.promocion}</td>
                  <td className="px-4 py-3 text-gray-600">{a.cohorte}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.actoDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.studentCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`${apiUrl}/api/inauguracion/${a.id}/pdf`}
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
