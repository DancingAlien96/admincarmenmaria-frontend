"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import type { Pagination, StudentListItem, StudentStatus } from "@/lib/types";

const STATUSES: (StudentStatus | "")[] = [
  "",
  "INSCRITO",
  "ACTIVO",
  "EGRESADO",
  "BAJA",
];

export default function StudentsPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "STUDENTS", "EDITOR");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StudentListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("page", String(page));
      const res = await api<{ data: StudentListItem[]; pagination: Pagination }>(
        `/api/students?${params.toString()}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250); // debounce de busqueda
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Expedientes</h1>
          <p className="text-sm text-gray-500">
            {pagination?.total ?? 0} estudiantes registrados
          </p>
        </div>
        {canEdit && (
          <Link
            href="/panel/estudiantes/nuevo"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo expediente
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Buscar por nombre o DPI…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StudentStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? STATUS_LABELS[s] : "Todos los estados"}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">DPI</th>
              <th className="px-4 py-3">Estado</th>
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
                  No hay expedientes que coincidan.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/estudiantes/detalle?id=${s.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.dpi}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.phonePrimary ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s._count.documents}
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
