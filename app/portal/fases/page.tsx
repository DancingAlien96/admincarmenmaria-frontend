"use client";

import {
  Award,
  BookOpen,
  Brain,
  Building2,
  Check,
  Heart,
  Info,
  MessagesSquare,
  Play,
  RotateCcw,
  Star,
  UserRound,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  HardDrive,
  Lock,
  Presentation,
  ChartPie,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { FaseContentItem, FaseItem, StudentFases } from "@/lib/types";

// Nota mínima por defecto si el servidor no la envía
const APROBACION_DEFAULT = 70;

const ESTADO: Record<FaseItem["estado"], { label: string; chip: string; dot: string }> = {
  completado: { label: "Completado", chip: "bg-green-50 text-green-700", dot: "bg-green-500" },
  "en-progreso": { label: "En curso", chip: "bg-brand-50 text-brand-700", dot: "bg-brand-500" },
  pendiente: { label: "Pendiente", chip: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};

// Colores de los anillos por sección (como en el prototipo)
const SECCION_COLOR: Record<string, { ring: string; dot: string }> = {
  tareas: { ring: "#f59e0b", dot: "bg-amber-500" },
  parciales: { ring: "var(--color-brand-600)", dot: "bg-brand-600" },
  final: { ring: "#16a34a", dot: "bg-green-600" },
  // Ponderación por actividad
  actividades: { ring: "var(--color-brand-400)", dot: "bg-brand-400" },
  examenes: { ring: "#16a34a", dot: "bg-green-600" },
};

function fmtCorta(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function fmtLarga(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export default function PortalFasesPage() {
  const [data, setData] = useState<StudentFases | null>(null);
  const [content, setContent] = useState<FaseContentItem[]>([]);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api<StudentFases>("/api/portal/fases"),
      api<{ items: FaseContentItem[] }>("/api/fase-content").catch(() => ({
        items: [] as FaseContentItem[],
      })),
    ]).then(([f, c]) => {
      setData(f);
      setContent(c.items);
    });
  }, []);

  if (!data) {
    return <p className="text-gray-400">Cargando tus fases…</p>;
  }

  // Una fase se desbloquea al completar la anterior (o si ya tiene notas)
  const bloqueada = (i: number) => {
    if (i === 0 || data.fases[i].items.length > 0) return false;
    const prev = data.fases[i - 1];
    const retoPendiente = (prev.reto?.preguntas ?? 0) > 0 && !prev.reto?.aprobado;
    return prev.estado !== "completado" || retoPendiente;
  };
  // Por defecto se abre la fase en curso
  const enCurso = data.fases.findIndex((f) => f.estado !== "completado");
  const activa = sel ?? (enCurso === -1 ? data.fases.length - 1 : enCurso);
  const fase = data.fases[activa];
  const aprobacion = data.notaMinima ?? APROBACION_DEFAULT;
  const del = content.filter((c) => c.fase === fase.fase);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Fases</h2>
        <p className="text-sm text-gray-500">
          Seguimiento de tu progreso académico por fase
        </p>
      </div>

      {/* Pestañas de fase */}
      <div className="inline-flex flex-wrap gap-1 rounded-full bg-gray-100 p-1">
        {data.fases.map((f, i) => {
          const lock = bloqueada(i);
          const on = i === activa;
          return (
            <button
              key={f.fase}
              disabled={lock}
              onClick={() => setSel(i)}
              title={lock ? `Completa la ${data.fases[i - 1].nombre} para desbloquear` : undefined}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition ${
                on
                  ? "bg-white font-semibold text-gray-900 shadow-sm"
                  : lock
                    ? "cursor-not-allowed text-gray-400"
                    : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${ESTADO[f.estado].dot}`} />
              {f.nombre}
              {lock && <Lock aria-hidden className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {/* Encabezado de la fase */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-700">
          {fase.fase}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-900">
            {fase.nombre}: {fase.subtitulo}
          </h3>
          <span
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO[fase.estado].chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${ESTADO[fase.estado].dot}`} />
            {ESTADO[fase.estado].label}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Trophy aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-gray-500">Promedio de la fase</p>
            <p className="text-2xl font-bold text-gray-900">
              {fase.promedio === null ? "—" : Math.round(fase.promedio)}
              <span className="text-sm font-normal text-gray-400">/100</span>
            </p>
          </div>
        </div>
      </section>

      {/* Gráfico de rendimiento */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <SectionTitle
            icon={ChartPie}
            title={`Gráfico de Rendimiento — ${fase.nombre}`}
            subtitle="Distribución de puntuación por sección"
          />
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {fase.desglose.map((d) => (
              <span key={d.clave} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${SECCION_COLOR[d.clave].dot}`} />
                {d.nombre} ({d.peso} pts)
              </span>
            ))}
          </div>
        </div>
        {fase.promedio === null ? (
          <Vacio icon={GraduationCap} text="Aún no hay calificaciones en esta fase." />
        ) : (
          <div className="px-5 py-8">
            <div className="flex flex-col items-center">
              <Anillo
                value={fase.promedio}
                max={100}
                size={170}
                stroke={16}
                color="var(--color-brand-600)"
                big
              />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                {fase.promedio >= aprobacion ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">
                    <CircleCheck aria-hidden className="h-3.5 w-3.5" />
                    {fase.resultado === "aprobada" ? "Fase aprobada" : "Vas aprobando"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                    {fase.resultado === "reprobada" ? "Fase reprobada" : "Por debajo de la nota mínima"}
                  </span>
                )}
                <span className="text-gray-500">
                  Nota mínima para aprobar: {aprobacion} pts
                </span>
              </div>
              {fase.modo === "puntos" && (
                <p className="mt-2 text-xs text-gray-500">
                  Llevas <b>{fase.puntosObtenidos}</b> de{" "}
                  <b>{fase.puntosEvaluados}</b> pts evaluados · la fase vale{" "}
                  {fase.puntosTotales} pts
                </p>
              )}
            </div>
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-4 border-t border-gray-100 pt-8">
              {fase.desglose.map((d) => (
                <div key={d.clave} className="flex flex-col items-center text-center">
                  <Anillo
                    value={d.puntos}
                    max={d.peso}
                    size={110}
                    stroke={11}
                    color={SECCION_COLOR[d.clave].ring}
                  />
                  <p className="mt-2 text-sm font-semibold text-gray-800">{d.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {d.promedio === null
                      ? "Sin evaluaciones"
                      : `Promedio ${Math.round(d.promedio)}% — ${d.evaluaciones} ${
                          d.evaluaciones === 1 ? "evaluación" : "evaluaciones"
                        }`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Presentaciones items={del.filter((c) => c.kind === "MATERIAL")} />
      <AreaTareas
        aprobacion={aprobacion}
        fase={fase}
        tareas={del.filter((c) => c.kind === "TAREA" || c.kind === "ACTIVIDAD")}
      />
      <Evaluaciones fase={fase} aprobacion={aprobacion} />
      <Programado items={del.filter((c) => c.kind === "EXAMEN")} />
      <Reto
        key={`reto-${fase.fase}`}
        fase={fase}
        onAprobado={() =>
          setData((d) =>
            d
              ? {
                  ...d,
                  fases: d.fases.map((f) =>
                    f.fase === fase.fase
                      ? { ...f, reto: { preguntas: f.reto?.preguntas ?? 0, aprobado: true } }
                      : f
                  ),
                }
              : d
          )
        }
      />
      <Encuesta key={`enc-${fase.fase}`} fase={fase} />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  tone = "bg-brand-50 text-brand-600",
}: {
  icon: typeof Award;
  title: string;
  subtitle?: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function Vacio({ icon: Icon, text }: { icon: typeof Award; text: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <Icon aria-hidden className="mx-auto h-8 w-8 text-gray-300" />
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  );
}

// Anillo de progreso (SVG)
function Anillo({
  value,
  max,
  size,
  stroke,
  color,
  big,
}: {
  value: number | null;
  max: number;
  size: number;
  stroke: number;
  color: string;
  big?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f2" strokeWidth={stroke} />
        {frac > 0 && <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
        />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${big ? "text-4xl" : "text-2xl"} font-bold text-gray-900`}>
          {value === null ? "—" : Math.round(value)}
        </span>
        <span className="text-[11px] text-gray-400">de {max} pts</span>
      </div>
    </div>
  );
}

// Presentaciones y materiales del docente para la fase
function Presentaciones({ items }: { items: FaseContentItem[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
        <SectionTitle
          icon={Presentation}
          tone="bg-amber-50 text-amber-600"
          title="Presentaciones del Docente"
          subtitle={`${items.length} ${items.length === 1 ? "archivo" : "archivos"} — Material de clase disponible para descarga`}
        />
        <span className="text-xs text-gray-500">
          {items.length} {items.length === 1 ? "presentación" : "presentaciones"}
        </span>
      </div>
      {items.length === 0 ? (
        <Vacio icon={Presentation} text="El docente aún no ha publicado material en esta fase." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((it) => {
            const ext = (it.fileUrl?.split(".").pop() ?? "").toUpperCase().slice(0, 4);
            const ppt = ext.startsWith("PPT");
            return (
              <li key={it.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    ppt ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
                  }`}
                >
                  {ppt ? (
                    <Presentation aria-hidden className="h-5 w-5" />
                  ) : (
                    <FileText aria-hidden className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{it.title}</p>
                  {it.description && (
                    <p className="text-sm text-gray-500">{it.description}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    {it.date && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                        {fmtLarga(it.date)}
                      </span>
                    )}
                    {it.sizeLabel && (
                      <span className="inline-flex items-center gap-1">
                        <HardDrive aria-hidden className="h-3.5 w-3.5" />
                        {it.sizeLabel}
                      </span>
                    )}
                    {ext && <span>{ext}</span>}
                  </p>
                </div>
                {it.fileUrl && (
                  <a
                    href={it.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
                  >
                    <Download aria-hidden className="h-4 w-4" />
                    Descargar
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Tareas: las calificadas (notas del alumno) y las asignadas aún sin nota
function AreaTareas({
  fase,
  tareas,
  aprobacion,
}: {
  fase: FaseItem;
  tareas: FaseContentItem[];
  aprobacion: number;
}) {
  const calificadas = fase.items.filter(
    (i) => i.category === "TAREA" || i.category === "ACTIVIDAD"
  );
  const nombres = new Set(calificadas.map((c) => norm(c.name)));
  const enlazadas = new Set(calificadas.map((c) => c.faseItemId).filter(Boolean));
  const sinNota = tareas.filter(
    (t) => !enlazadas.has(t.id) && !nombres.has(norm(t.title))
  );
  const filas = [
    ...calificadas.map((g) => ({
      id: g.id,
      titulo: g.name,
      nota: `${g.score}/${g.maxScore}`,
      pct: g.pct,
      puntos:
        g.puntos != null && g.ptsObtenidos != null
          ? `${g.ptsObtenidos} / ${g.puntos}`
          : "—",
      fecha: g.date,
      calificado: true,
    })),
    ...sinNota.map((t) => ({
      id: t.id,
      titulo: t.title,
      nota: "—",
      pct: null as number | null,
      puntos: t.puntos ? `vale ${t.puntos}` : "—",
      fecha: t.date,
      calificado: false,
    })),
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <SectionTitle
          icon={ClipboardList}
          tone="bg-gray-100 text-gray-600"
          title="Área de Tareas y Actividades"
          subtitle={`${filas.length} ${filas.length === 1 ? "tarea asignada" : "tareas asignadas"}`}
        />
      </div>
      {filas.length === 0 ? (
        <Vacio icon={ClipboardList} text="No hay tareas en esta fase todavía." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Tarea</th>
                <th className="px-5 py-3 text-center">Nota</th>
                <th className="px-5 py-3 text-center">Puntos</th>
                <th className="px-5 py-3 text-center">Entrega</th>
                <th className="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((f, i) => (
                <tr key={f.id}>
                  <td className="px-5 py-3 text-gray-400">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{f.titulo}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        f.pct === null
                          ? "text-gray-400"
                          : f.pct >= aprobacion
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {f.nota}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-xs font-medium text-gray-600">
                    {f.puntos}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-500">{fmtCorta(f.fecha)}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        f.calificado ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${f.calificado ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      {f.calificado ? "Calificado" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const EVAL_LABEL: Record<string, string> = {
  PRIMER_PARCIAL: "Primer Parcial",
  SEGUNDO_PARCIAL: "Segundo Parcial",
  EXAMEN_FINAL: "Examen Final",
  RECUPERACION: "Recuperación",
};

// Parciales, examen final y recuperación con su barra
function Evaluaciones({ fase, aprobacion }: { fase: FaseItem; aprobacion: number }) {
  const evals = fase.items.filter(
    (i) => i.category !== "TAREA" && i.category !== "ACTIVIDAD"
  );
  if (evals.length === 0) return null;
  return (
    <section>
      <div className="mb-3">
        <SectionTitle icon={Award} title="Evaluaciones" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {evals.map((e) => (
          <div key={e.id} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-medium text-gray-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <ClipboardCheck aria-hidden className="h-4 w-4" />
                </span>
                {EVAL_LABEL[e.category] ?? e.name}
              </span>
              <span className="text-xs text-gray-400">{fmtLarga(e.date)}</span>
            </div>
            <div className="flex items-end gap-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${e.pct >= aprobacion ? "bg-brand-600" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, e.pct)}%` }}
                />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {e.score}
                <span className="text-sm font-normal text-gray-400">/{e.maxScore}</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500">{Math.round(e.pct)}% del puntaje total</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Actividades y exámenes programados por el docente (a nivel de clase)
function Programado({ items }: { items: FaseContentItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <SectionTitle
          icon={CalendarDays}
          title="Actividades y exámenes programados"
          subtitle="Fechas publicadas para esta fase"
        />
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-0.5 rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
              {it.kind === "EXAMEN" ? "Examen" : "Actividad"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800">{it.title}</p>
              {(it.description || it.meta) && (
                <p className="text-xs text-gray-500">
                  {[it.description, it.meta].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-gray-400">{fmtLarga(it.date)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Reto de Comprensión ---------------------------------------------------

interface RetoData {
  fase: number;
  aprobacion: number;
  preguntas: { id: string; question: string; options: string[] }[];
  // Se habilita al completar la fase (mientras tanto no llegan preguntas)
  bloqueado: boolean;
  totalPreguntas: number;
  intentos: number;
  aprobado: boolean;
  mejor: number | null;
}

interface RetoResultado {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  resultado: { id: string; correcta: boolean }[];
}

function Reto({ fase, onAprobado }: { fase: FaseItem; onAprobado: () => void }) {
  const [data, setData] = useState<RetoData | null>(null);
  const [jugando, setJugando] = useState(false);
  const [resp, setResp] = useState<Record<string, number>>({});
  const [res, setRes] = useState<RetoResultado | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<RetoData>(`/api/portal/reto/${fase.fase}`).then(setData).catch(() => undefined);
  }, [fase.fase]);

  if (!data) return null;

  const titulo = `${fase.nombre}: Reto de Comprensión`;
  const sub =
    data.totalPreguntas === 0
      ? "Aún no publicado"
      : data.bloqueado
        ? `${data.totalPreguntas} preguntas · se habilita al completar la fase`
        : `${data.totalPreguntas} preguntas · Aprobación: ${data.aprobacion}% · Intento #${data.intentos + 1}`;

  async function enviar() {
    setBusy(true);
    try {
      const r = await api<RetoResultado>(`/api/portal/reto/${fase.fase}`, {
        method: "POST",
        body: { answers: resp },
      });
      setRes(r);
      setData((d) =>
        d
          ? {
              ...d,
              intentos: d.intentos + 1,
              aprobado: d.aprobado || r.passed,
              mejor: Math.max(d.mejor ?? 0, r.score),
            }
          : d
      );
      if (r.passed) onAprobado();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo enviar el reto");
    } finally {
      setBusy(false);
    }
  }

  const respondidas = Object.keys(resp).length;
  const malas = new Set(res?.resultado.filter((r) => !r.correcta).map((r) => r.id));

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <SectionTitle icon={Brain} tone="bg-amber-50 text-amber-600" title={titulo} subtitle={sub} />
      </div>

      {data.totalPreguntas === 0 ? (
        <Vacio icon={Brain} text="La escuela aún no ha publicado el reto de esta fase." />
      ) : data.bloqueado ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <Lock aria-hidden className="h-8 w-8" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-gray-900">Reto bloqueado</h3>
          <p className="mt-2 max-w-md text-sm text-gray-600">
            Se habilita cuando completes <b>{fase.nombre}</b>, es decir, cuando
            todas tus tareas, actividades y exámenes de la fase estén
            calificados. Al aprobarlo podrás avanzar a la siguiente fase.
          </p>
        </div>
      ) : !jugando ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
              data.aprobado ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <Trophy aria-hidden className="h-8 w-8" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            {data.aprobado ? "¡Reto aprobado!" : "Reto de Comprensión"}
          </h3>
          <p className="mt-2 max-w-md text-sm text-gray-600">
            {data.aprobado ? (
              <>
                Tu mejor resultado fue <b>{Math.round(data.mejor ?? 0)}%</b>. Puedes
                repetirlo para repasar cuando quieras.
              </>
            ) : (
              <>
                Demuestra que comprendiste los contenidos de <b>{fase.nombre}</b>. Esta
                evaluación NO afecta tu nota final de fase, pero es necesaria para
                desbloquear el acceso a la siguiente fase.
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <MessagesSquare aria-hidden className="h-3.5 w-3.5 text-amber-500" />
              {data.preguntas.length} preguntas
            </span>
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="h-3.5 w-3.5 text-green-500" />
              Necesitas {data.aprobacion}% para aprobar
            </span>
            <span className="inline-flex items-center gap-1">
              <RotateCcw aria-hidden className="h-3.5 w-3.5 text-amber-500" />
              Sin límite de intentos
            </span>
          </div>
          <button
            onClick={() => {
              setResp({});
              setRes(null);
              setJugando(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Play aria-hidden className="h-4 w-4" />
            {data.intentos > 0 ? "Intentar de nuevo" : "Comenzar Reto"}
          </button>
        </div>
      ) : (
        <div className="px-5 py-5">
          {res && (
            <div
              className={`mb-5 rounded-xl px-4 py-3 text-sm ${
                res.passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              <p className="font-semibold">
                {res.passed ? "¡Aprobaste el reto!" : "Aún no alcanzas el puntaje"} ·{" "}
                {res.correct} de {res.total} correctas ({Math.round(res.score)}%)
              </p>
              <p>
                {res.passed
                  ? "Ya puedes avanzar a la siguiente fase cuando la completes."
                  : `Necesitas ${data.aprobacion}%. Repasa las preguntas marcadas e inténtalo de nuevo.`}
              </p>
            </div>
          )}
          <ol className="space-y-4">
            {data.preguntas.map((p, i) => (
              <li
                key={p.id}
                className={`rounded-xl border p-4 ${
                  malas.has(p.id) ? "border-red-200 bg-red-50/40" : "border-gray-200"
                }`}
              >
                <p className="mb-2 text-sm font-medium text-gray-900">
                  {i + 1}. {p.question}
                </p>
                <div className="space-y-1.5">
                  {p.options.map((o, k) => (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        resp[p.id] === k
                          ? "border-brand-400 bg-brand-50 text-brand-800"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      } ${res ? "pointer-events-none" : ""}`}
                    >
                      <input
                        type="radio"
                        name={p.id}
                        checked={resp[p.id] === k}
                        onChange={() => setResp({ ...resp, [p.id]: k })}
                        className="accent-brand-600"
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setJugando(false)} className="text-sm text-gray-500 hover:underline">
              Volver
            </button>
            {res ? (
              <button
                onClick={() => {
                  setResp({});
                  setRes(null);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                <RotateCcw aria-hidden className="h-4 w-4" />
                Intentar de nuevo
              </button>
            ) : (
              <button
                onClick={() => void enviar()}
                disabled={busy || respondidas < data.preguntas.length}
                className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {busy
                  ? "Calificando…"
                  : `Enviar respuestas (${respondidas}/${data.preguntas.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// --- Encuesta de satisfacción ----------------------------------------------

interface EncuestaData {
  fase: number;
  secciones: {
    clave: string;
    nombre: string;
    criterios: { clave: string; nombre: string; detalle: string }[];
  }[];
  ratings: Record<string, number>;
}

const ENCUESTA_ICON: Record<string, { icon: typeof Award; tone: string }> = {
  instalaciones: { icon: Building2, tone: "bg-brand-50 text-brand-600" },
  docentes: { icon: UserRound, tone: "bg-green-50 text-green-600" },
  contenido: { icon: BookOpen, tone: "bg-amber-50 text-amber-600" },
};

function Encuesta({ fase }: { fase: FaseItem }) {
  const [data, setData] = useState<EncuestaData | null>(null);

  useEffect(() => {
    api<EncuestaData>(`/api/portal/encuesta/${fase.fase}`).then(setData).catch(() => undefined);
  }, [fase.fase]);

  // Sin criterios configurados para la fase no se muestra la encuesta
  if (!data || data.secciones.length === 0) return null;

  async function calificar(clave: string, rating: number) {
    const antes = data!.ratings;
    setData({ ...data!, ratings: { ...antes, [clave]: rating } });
    try {
      await api(`/api/portal/encuesta/${fase.fase}`, {
        method: "PUT",
        body: { clave, rating },
      });
    } catch {
      setData((d) => (d ? { ...d, ratings: antes } : d));
      alert("No se pudo guardar tu calificación. Intenta de nuevo.");
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <SectionTitle
          icon={Heart}
          tone="bg-red-50 text-red-500"
          title={`${fase.nombre}: Satisfacción del Estudiante`}
          subtitle="Evalúa tu experiencia en esta fase — tus respuestas nos ayudan a mejorar"
        />
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {data.secciones.map((s) => {
          const vals = s.criterios
            .map((c) => data.ratings[c.clave])
            .filter((v): v is number => v !== undefined);
          const prom = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          const meta = ENCUESTA_ICON[s.clave] ?? ENCUESTA_ICON.contenido;
          const Icon = meta.icon;
          return (
            <div key={s.clave} className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-3 flex items-center justify-center gap-2 font-semibold text-gray-900">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.tone}`}>
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                {s.nombre}
              </p>
              <div className="mb-4 flex justify-center">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 100 100" className="-rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="9" />
                    {prom !== null && (
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="var(--color-brand-600)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${(2 * Math.PI * 42 * prom) / 5} ${2 * Math.PI * 42}`}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">
                      {prom === null ? "—" : prom.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {prom === null ? "Sin evaluar" : "de 5"}
                    </span>
                  </div>
                </div>
              </div>
              <ul className="space-y-3">
                {s.criterios.map((c) => (
                  <li key={c.clave}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{c.nombre}</p>
                      <Estrellas
                        value={data.ratings[c.clave] ?? 0}
                        onChange={(v) => void calificar(c.clave, v)}
                        label={c.nombre}
                      />
                    </div>
                    {c.detalle && <p className="text-xs text-gray-500">{c.detalle}</p>}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-gray-200 pt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-500">Completado</span>
                  <span className="font-semibold text-gray-800">
                    {vals.length}/{s.criterios.length}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${(vals.length / s.criterios.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
        <Info aria-hidden className="h-3.5 w-3.5" />
        Toca las estrellas para calificar cada aspecto. Tus respuestas se guardan
        automáticamente.
      </p>
    </section>
  );
}

function Estrellas({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} de 5`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            aria-hidden
            className={`h-4 w-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}
