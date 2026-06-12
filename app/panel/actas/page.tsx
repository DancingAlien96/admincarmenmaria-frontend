"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type {
  ActaListItem,
  InauguracionListItem,
  Pagination,
} from "@/lib/types";

type Tab = "calificaciones" | "inauguracion";

export default function ActasPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "ACTAS", "EDITOR");
  const [tab, setTab] = useState<Tab>("calificaciones");

  // Deep-link: /panel/actas?tab=inauguracion abre directo esa pestaña.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "inauguracion") setTab("inauguracion");
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-800">Gestión de Actas</h1>
        {canEdit && <NuevaActaMenu />}
      </div>

      {/* Pestañas */}
      <div className="mb-5 flex gap-1 border-b border-gray-200">
        <TabButton
          active={tab === "calificaciones"}
          onClick={() => setTab("calificaciones")}
        >
          Calificaciones
        </TabButton>
        <TabButton
          active={tab === "inauguracion"}
          onClick={() => setTab("inauguracion")}
        >
          Inauguración
        </TabButton>
      </div>

      {tab === "calificaciones" ? (
        <CalificacionesList canEdit={canEdit} />
      ) : (
        <InauguracionList canEdit={canEdit} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

/* --- Botón único con menú desplegable para crear --- */
function NuevaActaMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        + Nueva acta
        <span className={`text-xs transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <Link
            href="/panel/actas/nueva"
            className="block px-4 py-3 text-sm text-gray-700 hover:bg-brand-50"
          >
            <span className="font-medium text-brand-700">
              Acta de calificaciones
            </span>
            <span className="block text-xs text-gray-400">
              Notas obtenidas por fase
            </span>
          </Link>
          <Link
            href="/panel/actas/inauguracion/nueva"
            className="block border-t border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-brand-50"
          >
            <span className="font-medium text-brand-700">
              Acta de inauguración
            </span>
            <span className="block text-xs text-gray-400">
              Inicio de cohorte
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

/* --- Listado: Actas de calificaciones --- */
function CalificacionesList({ canEdit }: { canEdit: boolean }) {
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
      <p className="mb-4 text-sm text-gray-500">
        {pagination?.total ?? 0} actas de calificaciones
      </p>

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
                  <td className="px-4 py-3 text-gray-600">{a._count.entries}</td>
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

      <Pager page={page} pagination={pagination} setPage={setPage} />
    </div>
  );
}

/* --- Listado: Actas de inauguración --- */
function InauguracionList({ canEdit }: { canEdit: boolean }) {
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
      <p className="mb-4 text-sm text-gray-500">
        {pagination?.total ?? 0} actas de inauguración
      </p>

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

      <Pager page={page} pagination={pagination} setPage={setPage} />
    </div>
  );
}

function Pager({
  page,
  pagination,
  setPage,
}: {
  page: number;
  pagination: Pagination | null;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
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
  );
}
