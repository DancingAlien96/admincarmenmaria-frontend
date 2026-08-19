"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import type { Pagination, StudentListItem, StudentStatus } from "@/lib/types";

const STATUSES: (StudentStatus | "")[] = ["", "ACTIVO", "EGRESADO", "BAJA"];

// Años de inscripcion para filtrar (del actual hacia atras)
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

export default function StudentsPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "STUDENTS", "EDITOR");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [sede, setSede] = useState("");
  const [year, setYear] = useState("");
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
      if (sede) params.set("sede", sede);
      if (year) params.set("year", year);
      params.set("page", String(page));
      const res = await api<{ data: StudentListItem[]; pagination: Pagination }>(
        `/api/students?${params.toString()}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, status, sede, year, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250); // debounce de busqueda
    return () => clearTimeout(t);
  }, [load]);

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [insOpen, setInsOpen] = useState<boolean | null>(null);

  // Estado del interruptor de inscripciones (solo admin).
  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api<{ inscripcionesAbiertas: boolean }>("/api/portal-invites/admin/settings")
      .then((r) => setInsOpen(r.inscripcionesAbiertas))
      .catch(() => setInsOpen(null));
  }, [user?.role]);

  async function toggleInscripciones() {
    try {
      const r = await api<{ inscripcionesAbiertas: boolean }>(
        "/api/portal-invites/admin/settings",
        { method: "POST", body: { open: !insOpen } }
      );
      setInsOpen(r.inscripcionesAbiertas);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo cambiar el estado.");
    }
  }

  async function generarLinkInscripcion() {
    setInviting(true);
    setInviteLink(null);
    try {
      const r = await api<{ token: string }>("/api/portal-invites", {
        method: "POST",
        body: {},
      });
      setInviteLink(`${window.location.origin}/inscripcion/?token=${r.token}`);
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : "No se pudo generar el link."
      );
    } finally {
      setInviting(false);
    }
  }

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
          <div className="flex flex-wrap gap-2">
            {user?.role === "ADMIN" && insOpen !== null && (
              <button
                onClick={() => void toggleInscripciones()}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  insOpen
                    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                }`}
                title="Habilita o deshabilita el formulario público de inscripción"
              >
                Inscripciones: {insOpen ? "Abiertas" : "Cerradas"}
              </button>
            )}
            {user?.role === "ADMIN" && (
              <button
                onClick={() => void generarLinkInscripcion()}
                disabled={inviting}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              >
                {inviting ? "Generando…" : "Link de inscripción"}
              </button>
            )}
            <Link
              href="/panel/estudiantes/duplicados"
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              Revisar duplicados
            </Link>
            <Link
              href="/panel/estudiantes/nuevo"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Nuevo expediente
            </Link>
          </div>
        )}
      </div>

      {inviteLink && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm">
          <p className="mb-2 font-medium text-brand-800">
            Link de inscripción generado — compártelo con el aspirante o
            imprime el QR:
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all rounded bg-white px-2 py-1 text-xs text-gray-700">
                  {inviteLink}
                </code>
                <button
                  onClick={() => void navigator.clipboard.writeText(inviteLink)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  Copiar
                </button>
                <button
                  onClick={() => setInviteLink(null)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <InviteQR link={inviteLink} />
          </div>
        </div>
      )}

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
        <select
          value={sede}
          onChange={(e) => {
            setSede(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todas las sedes</option>
          <option value="Chiquimula">Chiquimula</option>
          <option value="Morales Izabal">Morales Izabal</option>
        </select>
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todos los años</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
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
              <th className="px-4 py-3">Sede</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Docs</th>
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
                      {s.sortName ?? s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.dpi ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.sede ?? "—"}</td>
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

// QR del link de inscripción (para imprimir/compartir).
function InviteQR({ link }: { link: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  function download() {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscripcion-qr.png";
    a.click();
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div ref={wrapRef} className="rounded-lg bg-white p-2 shadow-sm">
        <QRCodeCanvas value={link} size={132} level="M" marginSize={2} />
      </div>
      <button
        onClick={download}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        Descargar QR
      </button>
    </div>
  );
}
