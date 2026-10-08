"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  Clock,
  FileCheck,
  FileText,
  FolderCheck,
  Layers,
  Library,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/labels";
import { usePortalMe } from "@/components/portal-context";
import type {
  FaseItem,
  PortalCuotas,
  PortalEvento,
  StudentChecklist,
  StudentFases,
} from "@/lib/types";

export default function PortalDashboardPage() {
  const { me } = usePortalMe();
  const [cuotas, setCuotas] = useState<PortalCuotas | null>(null);
  const [docs, setDocs] = useState<StudentChecklist | null>(null);
  const [fases, setFases] = useState<StudentFases | null>(null);
  const [eventos, setEventos] = useState<PortalEvento[] | null>(null);

  const aspirante =
    me?.student.status === "ASPIRANTE" || me?.student.status === "NO_ADMITIDO";

  useEffect(() => {
    if (!me || aspirante) return;
    api<PortalCuotas>("/api/portal/cuotas").then(setCuotas).catch(() => undefined);
    api<StudentChecklist>("/api/portal/documentos").then(setDocs).catch(() => undefined);
    api<StudentFases>("/api/portal/fases").then(setFases).catch(() => undefined);
    api<{ eventos: PortalEvento[] }>("/api/portal/actividad")
      .then((r) => setEventos(r.eventos))
      .catch(() => setEventos([]));
  }, [me, aspirante]);

  if (!me) {
    return <p className="text-gray-400">Cargando tu información…</p>;
  }

  const s = me.student;
  const firstName = s.fullName.split(" ")[0];
  if (aspirante) {
    return (
      <SolicitudAspirante
        name={firstName}
        status={s.status as "ASPIRANTE" | "NO_ADMITIDO"}
      />
    );
  }

  const pagadas = cuotas?.cuotas.filter((c) => c.estado === "pagado").length ?? 0;
  const porPagar =
    cuotas?.cuotas.filter((c) => c.estado !== "pagado" && c.estado !== "en_revision")
      .length ?? 0;
  const progreso = Math.round((me.fase.numero / me.fase.total) * 100);

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-lg font-semibold text-brand-700">
          {s.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photoUrl} alt={s.fullName} className="h-full w-full object-cover" />
          ) : (
            firstName[0]
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">Bienvenido/a, {firstName}</h2>
          <p className="text-sm text-gray-500">
            {s.expedienteNumber ? `Expediente ${s.expedienteNumber}` : "Expediente"}
            {s.sede ? ` · Sede ${s.sede}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {STATUS_LABELS[s.status]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              <BookOpen aria-hidden className="h-3.5 w-3.5" />
              Fase {me.fase.numero} - {me.fase.subtitulo}
            </span>
          </div>
        </div>
        <div className="w-full sm:w-56">
          <p className="mb-1.5 text-xs font-medium text-gray-600">
            Progreso del programa
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            Fase {me.fase.numero} de {me.fase.total} ({progreso}%)
          </p>
        </div>
      </section>

      {/* Resumen */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CheckCheck}
          tone="green"
          value={cuotas ? String(pagadas) : "—"}
          label="Pagos realizados"
          hint={cuotas ? `${porPagar} pendientes` : ""}
        />
        <StatCard
          icon={Clock}
          tone="amber"
          value={cuotas ? String(porPagar) : "—"}
          label="Pagos pendientes"
          hint="Requieren tu atención"
        />
        <StatCard
          icon={FolderCheck}
          tone="brand"
          value={docs ? `${docs.entregados}/${docs.total}` : "—"}
          label="Documentos entregados"
          hint={docs ? `${docs.total - docs.entregados} pendientes` : ""}
        />
      </section>

      {/* Rendimiento por fase */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Rendimiento por fase</h3>
            <p className="text-xs text-gray-500">
              Puntuación obtenida en cada fase del programa
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            <Legend className="bg-brand-700" label="Completado" />
            <Legend className="bg-brand-400" label="En curso" />
            <Legend className="border border-dashed border-gray-400 bg-white" label="Pendiente" />
          </div>
        </div>
        {fases ? <FasesChart fases={fases.fases} /> : <p className="py-16 text-center text-sm text-gray-400">Cargando…</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {/* Actividad reciente */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Actividad reciente</h3>
            <span className="text-xs text-gray-500">Últimos movimientos</span>
          </div>
          {!eventos ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : eventos.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Aún no hay movimientos.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {eventos.map((e) => {
                const Icon =
                  e.tipo === "pago"
                    ? CircleDollarSign
                    : e.tipo === "documento"
                      ? FileCheck
                      : UserCheck;
                return (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        e.estado === "revision"
                          ? "bg-amber-50 text-amber-600"
                          : e.estado === "info"
                            ? "bg-brand-50 text-brand-600"
                            : "bg-green-50 text-green-600"
                      }`}
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">{e.titulo}</p>
                      <p className="text-xs text-gray-400">{e.fecha.slice(0, 10)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 className="mb-3 font-semibold text-gray-900">Accesos rápidos</h3>
          <div className="space-y-2">
            <QuickLink
              href="/portal/pagos"
              icon={CircleDollarSign}
              tone="green"
              title="Registrar pago"
              hint="Subir comprobante"
            />
            <QuickLink
              href="/portal/documentos"
              icon={FileText}
              tone="brand"
              title="Documentos pendientes"
              hint={docs ? `${docs.total - docs.entregados} por entregar` : "Ver estado"}
            />
            <QuickLink
              href="/portal/fases"
              icon={Layers}
              tone="amber"
              title="Mis fases"
              hint="Calificaciones y material"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

const TONES = {
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  brand: "bg-brand-50 text-brand-600",
} as const;

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
  hint,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-700">{label}</p>
      <p className="text-xs text-gray-400">{hint}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  tone,
  title,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-800">{title}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
      <ChevronRight aria-hidden className="h-4 w-4 text-gray-400" />
    </Link>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

// Gráfico de área con la nota de cada fase y la línea de aprobación (70).
const APROBACION = 70;

function FasesChart({ fases }: { fases: FaseItem[] }) {
  const W = 900;
  const H = 280;
  const left = 40;
  const right = W - 60;
  const top = 20;
  const bottom = H - 30;
  const x = (i: number) => left + ((right - left) * i) / Math.max(1, fases.length - 1);
  const y = (v: number) => bottom - ((bottom - top) * v) / 100;
  const pts = fases
    .map((f, i) => ({ i, v: f.promedio, f }))
    .filter((p): p is { i: number; v: number; f: FaseItem } => p.v !== null);

  // Curva suave entre puntos (Catmull-Rom a Bézier)
  let line = "";
  pts.forEach((p, k) => {
    const px = x(p.i);
    const py = y(p.v);
    if (k === 0) {
      line = `M ${px} ${py}`;
      return;
    }
    const prev = pts[k - 1];
    const cx = (x(prev.i) + px) / 2;
    line += ` C ${cx} ${y(prev.v)}, ${cx} ${py}, ${px} ${py}`;
  });
  const area =
    pts.length > 1
      ? `${line} L ${x(pts[pts.length - 1].i)} ${bottom} L ${x(pts[0].i)} ${bottom} Z`
      : "";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Rendimiento por fase">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={left} x2={right} y1={y(g)} y2={y(g)} stroke="#e5e7eb" strokeDasharray="4 6" />
            <text x={right + 12} y={y(g) + 4} fontSize="12" fill="#6b7280">
              {g}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="var(--color-brand-100)" opacity="0.55" />}
        {line && <path d={line} fill="none" stroke="var(--color-brand-600)" strokeWidth="3" />}
        {/* Línea de aprobación */}
        <line x1={left} x2={right} y1={y(APROBACION)} y2={y(APROBACION)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 5" />
        <rect x={left + 8} y={y(APROBACION) - 22} width="150" height="18" rx="9" fill="#ef4444" />
        <text x={left + 18} y={y(APROBACION) - 9} fontSize="11" fontWeight="600" fill="#ffffff">
          Aprobación: {APROBACION} pts
        </text>
        {fases.map((f, i) =>
          f.promedio === null ? (
            <circle key={f.fase} cx={x(i)} cy={bottom} r="7" fill="#ffffff" stroke="#9ca3af" strokeWidth="2" strokeDasharray="3 2" />
          ) : (
            <circle
              key={f.fase}
              cx={x(i)}
              cy={y(f.promedio)}
              r="7"
              fill={f.estado === "completado" ? "var(--color-brand-700)" : "var(--color-brand-400)"}
              stroke="#ffffff"
              strokeWidth="3"
            />
          )
        )}
      </svg>
      <div className="mt-2 grid grid-cols-3 border-t border-gray-100 pt-4 text-center">
        {fases.map((f) => (
          <div key={f.fase}>
            <p className="text-xs font-medium text-gray-700">Fase {f.fase}</p>
            <p className="truncate text-[11px] text-gray-400">{f.subtitulo}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {f.promedio === null ? "—" : Math.round(f.promedio)}
            </p>
            <p className="text-[11px] text-gray-400">pts</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inicio del portal mientras la persona es aspirante (aún no admitida).
function SolicitudAspirante({
  name,
  status,
}: {
  name: string;
  status: "ASPIRANTE" | "NO_ADMITIDO";
}) {
  const [cuotas, setCuotas] = useState<PortalCuotas | null>(null);
  useEffect(() => {
    if (status !== "ASPIRANTE") return;
    api<PortalCuotas>("/api/portal/cuotas")
      .then(setCuotas)
      .catch(() => setCuotas(null));
  }, [status]);
  const pagado =
    !!cuotas && cuotas.summary.totalCharged > 0 && cuotas.summary.totalDue <= 0;
  const enRevision = !!cuotas?.cuotas.some((c) => c.estado === "en_revision");
  const pasos = [
    { titulo: "Ficha de inscripción", hecho: true },
    {
      titulo: enRevision
        ? "Pago del examen de admisión (en revisión)"
        : "Pago del examen de admisión",
      hecho: pagado,
    },
    { titulo: "Resultado del examen", hecho: false },
  ];
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">
          Mi solicitud de ingreso
        </h1>
        <p className="text-sm text-gray-500">
          Escuela Privada de Auxiliares de Enfermería Carmen María
        </p>
      </div>

      {status === "NO_ADMITIDO" ? (
        <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-red-800">Hola, {name}</h2>
          <p className="mt-2 text-sm text-gray-600">
            Gracias por participar en el proceso de admisión. En esta ocasión
            no fue posible tu ingreso. Si deseas volver a intentarlo,
            comunícate con la escuela.
          </p>
        </section>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-amber-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-brand-800">
              Hola, {name}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Tu solicitud fue recibida. Para continuar, paga tu{" "}
              <b>examen de admisión</b>. Cuando la escuela registre tu
              resultado y seas admitido/a, aquí verás tu plan de pagos, tus
              fases y materiales.
            </p>
            {pagado ? (
              <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                Tu examen está pagado. La escuela te avisará tu resultado.
              </p>
            ) : (
              !enRevision && (
                <Link
                  href="/portal/pagos"
                  className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Pagar examen de admisión
                </Link>
              )
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="mb-3 font-semibold text-gray-800">
              Proceso de admisión
            </h3>
            <ol className="space-y-3">
              {pasos.map((p, i) => (
                <li key={p.titulo} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      p.hecho
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.hecho ? <Check aria-hidden className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={p.hecho ? "text-gray-800" : "text-gray-500"}>
                    {p.titulo}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-gray-400">
              El estado del pago lo ves en la sección Pagos.
            </p>
            <Link
              href="/portal/ebooks"
              className="mt-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm hover:bg-brand-50"
            >
              <span>
                <span className="flex items-center gap-1.5 font-medium text-brand-800">
                  <Library aria-hidden className="h-4 w-4" />
                  Material de estudio
                </span>
                <span className="text-xs text-gray-500">
                  Guías para preparar tu examen de admisión
                </span>
              </span>
              <ArrowRight aria-hidden className="h-4 w-4 text-brand-600" />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
