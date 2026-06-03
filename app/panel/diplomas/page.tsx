"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { GraduateListItem, Pagination } from "@/lib/types";

export default function GraduatesPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "DIPLOMAS", "EDITOR");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GraduateListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await api<{ data: GraduateListItem[]; pagination: Pagination }>(
        `/api/graduates?${params.toString()}`
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Banca de Diplomas
          </h1>
          <p className="text-sm text-gray-500">
            {pagination?.total ?? 0} egresados registrados
          </p>
        </div>
        {canEdit && (
          <Link
            href="/panel/diplomas/nuevo"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Registrar egresado
          </Link>
        )}
      </div>

      <input
        placeholder="Buscar por nombre, DPI o número de diploma…"
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
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">DPI</th>
              <th className="px-4 py-3">No. Diploma</th>
              <th className="px-4 py-3">Graduación</th>
              <th className="px-4 py-3">MSPAS</th>
              <th className="px-4 py-3">Diploma</th>
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
                  No hay egresados que coincidan.
                </td>
              </tr>
            ) : (
              items.map((g) => (
                <tr key={g.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/diplomas/detalle?id=${g.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {g.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{g.dpi}</td>
                  <td className="px-4 py-3 text-gray-600">{g.diplomaNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {g.graduationDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {g.mspasCode ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {g.diplomaUrl ? (
                      <a
                        href={g.diplomaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        Ver
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
            No hay egresados que coincidan.
          </p>
        ) : (
          items.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/panel/diplomas/detalle?id=${g.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {g.fullName}
                </Link>
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {g.diplomaNumber}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-600">
                <div>
                  <dt className="text-xs text-gray-400">DPI</dt>
                  <dd>{g.dpi}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Graduación</dt>
                  <dd>{g.graduationDate.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">MSPAS</dt>
                  <dd>{g.mspasCode ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Diploma</dt>
                  <dd>
                    {g.diplomaUrl ? (
                      <a
                        href={g.diplomaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
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
