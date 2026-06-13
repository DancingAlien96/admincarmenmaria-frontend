"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  EXPENSE_CATEGORY_LABELS,
  formatGTQ,
  PAYMENT_METHOD_LABELS,
} from "@/lib/labels";
import type { DashboardData } from "@/lib/types";
import { ExpensesPanel } from "@/components/expenses-panel";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Mes actual en formato "YYYY-MM"
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Primer y último día de un mes "YYYY-MM" en formato YYYY-MM-DD (sin desfase UTC)
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

// Desplaza el mes "YYYY-MM" por delta meses
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const { from, to } = monthRange(month);
  const isCurrentOrFuture = month >= currentMonth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = monthRange(month);
      const params = new URLSearchParams(range);
      const res = await api<DashboardData>(`/api/dashboard?${params}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const reportUrl = `${apiUrl}/api/dashboard/report?from=${from}&to=${to}`;
  const excelUrl = `${apiUrl}/api/dashboard/report.xlsx?from=${from}&to=${to}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Dashboard Financiero
          </h1>
          <p className="text-sm text-gray-500">
            Hola {user?.name?.split(" ")[0]}, estado financiero de{" "}
            <span className="font-medium text-gray-700">
              {monthLabel(month)}
            </span>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500">Mes</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Mes anterior"
                className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                ‹
              </button>
              <input
                type="month"
                value={month}
                max={currentMonth()}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                disabled={isCurrentOrFuture}
                aria-label="Mes siguiente"
                className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Exportar PDF
          </a>
          <a
            href={excelUrl}
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Exportar Excel
          </a>
        </div>
      </div>

      {loading || !data ? (
        <p className="text-gray-400">Cargando…</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Ingreso neto"
              value={formatGTQ(data.kpis.netIncome)}
              tone="green"
              sub={`${data.kpis.paymentsCount} pagos`}
            />
            <Kpi
              label="Egresos"
              value={formatGTQ(data.kpis.totalExpenses)}
              tone="red"
              sub={`${data.kpis.expensesCount} registros`}
            />
            <Kpi
              label={data.kpis.balance >= 0 ? "Saldo del mes" : "Déficit del mes"}
              value={formatGTQ(data.kpis.balance)}
              tone={data.kpis.balance >= 0 ? "green" : "red"}
              sub={
                data.kpis.balance >= 0
                  ? "ingresos − egresos"
                  : "egresos mayores que ingresos"
              }
              highlight
            />
            <Kpi
              label="Descuentos / becas"
              value={formatGTQ(data.kpis.discounts)}
              tone="gray"
              sub={`bruto ${formatGTQ(data.kpis.grossIncome)}`}
            />
          </div>

          {/* Gráfica mensual */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-brand-800">
              Ingresos vs egresos (últimos 12 meses)
            </h2>
            <MonthlyChart data={data} />
          </section>

          {/* Desgloses */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Breakdown
              title="Ingresos por método"
              rows={data.incomeByMethod.map((m) => ({
                label: PAYMENT_METHOD_LABELS[m.method],
                value: m.total,
              }))}
              tone="green"
            />
            <Breakdown
              title="Egresos por categoría"
              rows={data.expensesByCategory.map((c) => ({
                label: EXPENSE_CATEGORY_LABELS[c.category],
                value: c.total,
              }))}
              tone="red"
            />
          </div>

          {/* Gestión de egresos */}
          <div className="mt-6">
            <ExpensesPanel from={from} to={to} onChanged={load} />
          </div>
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
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "green" | "red" | "gray";
  highlight?: boolean;
}) {
  const toneColor =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
        ? "text-red-700"
        : "text-gray-700";
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-brand-300 bg-brand-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Breakdown({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { label: string; value: number }[];
  tone: "green" | "red";
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const bar = tone === "green" ? "bg-green-500" : "bg-red-500";
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">Sin datos en el periodo.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-medium text-gray-800">
                  {formatGTQ(r.value)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full ${bar}`}
                  style={{
                    width: total > 0 ? `${(r.value / total) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Gráfica de barras simple en CSS (sin librerías externas)
function MonthlyChart({ data }: { data: DashboardData }) {
  const max = Math.max(
    1,
    ...data.monthly.map((m) => Math.max(m.income, m.expense))
  );
  return (
    <div className="overflow-x-auto">
      <div
        className="flex min-w-[560px] items-end gap-2"
        style={{ height: 200 }}
      >
        {data.monthly.map((m) => (
          <div
            key={m.label}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 170 }}>
              <div
                className="w-1/2 rounded-t bg-green-500"
                style={{ height: `${(m.income / max) * 100}%` }}
                title={`Ingresos: ${formatGTQ(m.income)}`}
              />
              <div
                className="w-1/2 rounded-t bg-red-400"
                style={{ height: `${(m.expense / max) * 100}%` }}
                title={`Egresos: ${formatGTQ(m.expense)}`}
              />
            </div>
            <span className="text-[10px] text-gray-400">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500" /> Ingresos
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-400" /> Egresos
        </span>
      </div>
    </div>
  );
}
