"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import type {
  Pagination,
  PendingBoleta,
  StudentListItem,
  StudentStatus,
} from "@/lib/types";

const STATUSES: (StudentStatus | "")[] = [
  "",
  "ASPIRANTE",
  "ACTIVO",
  "EGRESADO",
  "BAJA",
  "NO_ADMITIDO",
];

// Cuántos nombres se muestran en el aviso de comprobantes por revisar
const BOLETAS_PREVIEW = 5;

// Años de inscripcion para filtrar (del actual hacia atras)
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

export default function StudentsPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "STUDENTS", "EDITOR");
  const canPagos = canAccess(user, "PAYMENTS", "READER");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [sede, setSede] = useState("");
  const [year, setYear] = useState("");
  const [soloBoletas, setSoloBoletas] = useState(false);
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
      if (soloBoletas) params.set("boletas", "true");
      params.set("page", String(page));
      const res = await api<{ data: StudentListItem[]; pagination: Pagination }>(
        `/api/students?${params.toString()}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, status, sede, year, soloBoletas, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250); // debounce de busqueda
    return () => clearTimeout(t);
  }, [load]);

  // Boletas que los alumnos subieron desde el portal y esperan revisión;
  // se revisan dentro del expediente de cada alumno.
  const [boletas, setBoletas] = useState<PendingBoleta[]>([]);
  useEffect(() => {
    if (!canPagos) return;
    api<{ payments: PendingBoleta[] }>("/api/payments/pending")
      .then((r) => setBoletas(r.payments))
      .catch(() => setBoletas([]));
  }, [canPagos]);
  const boletasPorAlumno = [
    ...boletas
      .reduce((m, b) => {
        if (!b.student) return m;
        const prev = m.get(b.student.id);
        m.set(b.student.id, {
          id: b.student.id,
          name: b.student.fullName,
          count: (prev?.count ?? 0) + 1,
        });
        return m;
      }, new Map<string, { id: string; name: string; count: number }>())
      .values(),
  ];

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
      setInviteLink(`${window.location.origin}/inscripcion/?t=${r.token}`);
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
                <CopyButton text={inviteLink} />
                <button
                  onClick={() => setInviteLink(null)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cerrar
                </button>
              </div>
              <WhatsAppShare link={inviteLink} />
            </div>
            <InviteQR link={inviteLink} />
          </div>
        </div>
      )}

      {boletasPorAlumno.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-amber-800">
              {boletasPorAlumno.length} estudiante(s) con comprobantes de pago
              por revisar
            </p>
            <button
              onClick={() => {
                setSoloBoletas((v) => !v);
                setPage(1);
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {soloBoletas ? "Ver todos los expedientes" : "Ver solo estos"}
            </button>
          </div>
          {/* Vista previa corta; la lista completa se ve filtrando la tabla */}
          {!soloBoletas && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {boletasPorAlumno.slice(0, BOLETAS_PREVIEW).map((b) => (
                <Link
                  key={b.id}
                  href={`/panel/estudiantes/detalle?id=${b.id}`}
                  className="max-w-[14rem] truncate rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  {b.name}
                  {b.count > 1 && ` (${b.count})`}
                </Link>
              ))}
              {boletasPorAlumno.length > BOLETAS_PREVIEW && (
                <span className="text-xs text-amber-700">
                  +{boletasPorAlumno.length - BOLETAS_PREVIEW} más
                </span>
              )}
            </div>
          )}
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
                    {canPagos && (s._count.payments ?? 0) > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Boleta por revisar
                      </span>
                    )}
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
function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        })
      }
      className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
    >
      {ok ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
      {ok ? "Copiado" : "Copiar"}
    </button>
  );
}

// Número de WhatsApp: 8 dígitos = Guatemala (se antepone 502).
function waNumber(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length === 8 ? `502${d}` : d;
}

// Comparte el link por WhatsApp: al número escrito o eligiendo el contacto.
function WhatsAppShare({ link }: { link: string }) {
  const [phone, setPhone] = useState("");
  const num = waNumber(phone);
  const invalido = phone.trim() !== "" && num.length < 8;
  const texto =
    "¡Hola! Te compartimos el formulario de inscripción de la Escuela de " +
    `Enfermería Carmen María. Llénalo aquí:
${link}`;
  const href = `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder="WhatsApp del aspirante (opcional)"
        className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
      />
      <a
        href={invalido ? undefined : href}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={invalido}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
          invalido ? "pointer-events-none bg-gray-300" : "bg-[#25D366] hover:bg-[#1ebe5b]"
        }`}
      >
        <MessageCircle aria-hidden className="h-3.5 w-3.5" />
        Enviar por WhatsApp
      </a>
      <span className="text-[11px] text-gray-500">
        {phone.trim() ? (invalido ? "Número incompleto" : `Se abrirá el chat con +${num}`) : "Sin número, eliges el contacto en WhatsApp"}
      </span>
    </div>
  );
}

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
