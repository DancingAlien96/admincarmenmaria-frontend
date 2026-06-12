"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, formatGTQ } from "@/lib/labels";
import type { ModuleSection, OverviewData } from "@/lib/types";

export default function PanelHome() {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<OverviewData>("/api/dashboard/overview")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">
          Hola, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500">
          Resumen general de la Escuela de Enfermería Carmen María
          {data ? ` · ${data.year}` : ""}.
        </p>
      </div>

      {loading || !data ? (
        <p className="text-gray-400">Cargando estadísticas…</p>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Estudiantes activos"
              value={String(data.students.byStatus.ACTIVO)}
              sub={`${data.students.total} en total`}
              tone="brand"
            />
            <Kpi
              label="Egresados"
              value={String(data.graduatesTotal)}
              sub="en banca de diplomas"
              tone="brand"
            />
            <Kpi
              label={`Ingresos ${data.year}`}
              value={formatGTQ(data.finance.incomeYear)}
              sub={`saldo ${formatGTQ(data.finance.balanceYear)}`}
              tone="green"
            />
            <Kpi
              label="Mora acumulada"
              value={formatGTQ(data.finance.moraTotal)}
              sub={data.finance.moraTotal > 0 ? "pendiente de cobro" : "al día"}
              tone={data.finance.moraTotal > 0 ? "red" : "green"}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Gráfica de ingresos mensuales */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
              <h2 className="mb-4 font-semibold text-brand-800">
                Ingresos por mes ({data.year})
              </h2>
              <IncomeChart data={data.monthlyIncome} />
            </section>

            {/* Estudiantes por estado */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 font-semibold text-brand-800">
                Estudiantes por estado
              </h2>
              <StatusBars byStatus={data.students.byStatus} total={data.students.total} />
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Origen de pagos */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 font-semibold text-brand-800">
                Origen de los pagos ({data.year})
              </h2>
              {data.paymentsBySource.length === 0 ? (
                <p className="text-sm text-gray-400">Sin pagos este año.</p>
              ) : (
                <div className="space-y-3">
                  {data.paymentsBySource.map((s) => (
                    <SourceRow
                      key={s.source}
                      label={s.source === "WOOCOMMERCE" ? "Tienda en línea" : "Manual"}
                      total={s.total}
                      count={s.count}
                      grand={data.finance.incomeYear}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Mini contadores */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 font-semibold text-brand-800">Otros indicadores</h2>
              <div className="grid grid-cols-2 gap-4">
                <MiniStat label="Egresos del año" value={formatGTQ(data.finance.expenseYear)} />
                <MiniStat label="Actas generadas" value={String(data.actasTotal)} />
                <MiniStat label="De baja" value={String(data.students.byStatus.BAJA)} />
                <MiniStat label="Mensajes WhatsApp" value={String(data.whatsappOutbound)} />
              </div>
            </section>
          </div>

          {/* Demografía por sede */}
          <SedeSection data={data} />

          {/* Accesos rápidos */}
          <QuickAccess user={user} />
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "brand" | "green" | "red";
}) {
  const color =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
        ? "text-red-700"
        : "text-brand-800";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function IncomeChart({ data }: { data: { label: string; income: number }[] }) {
  const max = Math.max(1, ...data.map((m) => m.income));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 200 }}>
        {data.map((m) => (
          <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t bg-brand-500 transition-all hover:bg-brand-600"
              style={{ height: `${(m.income / max) * 170}px` }}
              title={`${m.label}: ${formatGTQ(m.income)}`}
            />
            <span className="text-[10px] text-gray-400">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVO: { label: "Activos", color: "bg-green-500" },
  EGRESADO: { label: "Egresados", color: "bg-brand-500" },
  BAJA: { label: "Baja", color: "bg-gray-400" },
};

function StatusBars({
  byStatus,
  total,
}: {
  byStatus: Record<string, number>;
  total: number;
}) {
  if (total === 0)
    return <p className="text-sm text-gray-400">Sin estudiantes registrados.</p>;
  return (
    <div className="space-y-3">
      {(["ACTIVO", "EGRESADO", "BAJA"] as const).map((s) => {
        const n = byStatus[s] ?? 0;
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <div key={s}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-600">{STATUS_META[s].label}</span>
              <span className="font-medium text-gray-800">{n}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full ${STATUS_META[s].color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourceRow({
  label,
  total,
  count,
  grand,
}: {
  label: string;
  total: number;
  count: number;
  grand: number;
}) {
  const pct = grand > 0 ? Math.round((total / grand) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-600">
          {label} <span className="text-gray-400">· {count} pagos</span>
        </span>
        <span className="font-medium text-gray-800">{formatGTQ(total)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-0.5 font-bold text-gray-800">{value}</p>
    </div>
  );
}

/* --- Demografía por sede --- */
const SEDE_COLORS = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function SedeSection({ data }: { data: OverviewData }) {
  const hasData =
    data.studentsBySede.length > 0 ||
    data.incomeBySede.length > 0 ||
    data.enrollmentsBySede.length > 0;
  if (!hasData) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
        Demografía por sede
      </h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-brand-800">
            Estudiantes por sede
          </h3>
          <SedeBars
            rows={data.studentsBySede.map((s) => ({
              label: s.sede,
              value: s.count,
              display: String(s.count),
            }))}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-brand-800">
            Ingresos por sede ({data.year})
          </h3>
          <SedeBars
            rows={data.incomeBySede.map((s) => ({
              label: s.sede,
              value: s.total,
              display: formatGTQ(s.total),
              hint: `${s.count} pagos`,
            }))}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-brand-800">
            Inscripciones {data.year} por sede
          </h3>
          <SedeBars
            rows={data.enrollmentsBySede.map((s) => ({
              label: s.sede,
              value: s.count,
              display: String(s.count),
            }))}
          />
        </div>
      </div>
    </section>
  );
}

function SedeBars({
  rows,
}: {
  rows: { label: string; value: number; display: string; hint?: string }[];
}) {
  if (rows.length === 0)
    return <p className="text-sm text-gray-400">Sin datos.</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-600">
              {r.label}
              {r.hint && <span className="text-gray-400"> · {r.hint}</span>}
            </span>
            <span className="font-medium text-gray-800">{r.display}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full ${
                SEDE_COLORS[i % SEDE_COLORS.length]
              }`}
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const QUICK: { href: string; title: string; section: ModuleSection }[] = [
  { href: "/panel/estudiantes", title: "Expedientes", section: "STUDENTS" },
  { href: "/panel/pagos", title: "Control de Pagos", section: "PAYMENTS" },
  { href: "/panel/recordatorios", title: "Recordatorios", section: "REMINDERS" },
  { href: "/panel/dashboard", title: "Dashboard Financiero", section: "DASHBOARD" },
  { href: "/panel/diplomas", title: "Banca de Diplomas", section: "DIPLOMAS" },
  { href: "/panel/actas", title: "Gestión de Actas", section: "ACTAS" },
];

function QuickAccess({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const items = QUICK.filter((q) => canAccess(user, q.section));
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
        Accesos rápidos
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:border-brand-300 hover:bg-brand-50"
          >
            {q.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
