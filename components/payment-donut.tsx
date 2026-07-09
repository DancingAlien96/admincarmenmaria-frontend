"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MonthlyPaymentStatus } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const PAID = "#059669"; // verde: pagaron
const PENDING = "#f1a4a4"; // rojo suave: pendientes (fondo del anillo)

export function PaymentDonut() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthlyPaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<MonthlyPaymentStatus>(
        `/api/dashboard/payment-status?month=${month}`
      );
      setData(r);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const isCurrentOrFuture = month >= currentMonth();

  const total = data?.total ?? 0;
  const paid = data?.paid ?? 0;
  const pending = data?.pending ?? 0;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Geometría del anillo
  const R = 62;
  const SW = 22;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? paid / total : 0;

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-brand-800">
            Pagos puntuales vs. mora
          </h2>
          <p className="text-xs text-gray-500">
            Mensualidad del mes: quién ya pagó y quién está pendiente.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Mes anterior"
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ‹
          </button>
          <span className="min-w-[130px] text-center text-sm font-medium text-gray-700">
            {data?.label ?? "…"}
          </span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentOrFuture}
            aria-label="Mes siguiente"
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {loading || !data ? (
        <p className="py-10 text-center text-gray-400">Cargando…</p>
      ) : total === 0 ? (
        <p className="py-10 text-center text-gray-400">
          No hay estudiantes activos para este mes.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-8">
          {/* Anillo */}
          <div className="relative" style={{ width: 170, height: 170 }}>
            <svg viewBox="0 0 170 170" className="h-full w-full">
              <circle
                cx="85"
                cy="85"
                r={R}
                fill="none"
                stroke={PENDING}
                strokeWidth={SW}
              />
              <circle
                cx="85"
                cy="85"
                r={R}
                fill="none"
                stroke={PAID}
                strokeWidth={SW}
                strokeDasharray={`${frac * C} ${C}`}
                strokeLinecap="round"
                transform="rotate(-90 85 85)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-brand-800">{pct}%</span>
              <span className="text-xs text-gray-500">al día</span>
            </div>
          </div>

          {/* Leyenda / conteos */}
          <div className="space-y-3">
            <Legend color={PAID} label="Pagaron su mensualidad" value={paid} />
            <Legend color={PENDING} label="Pendientes (mora)" value={pending} />
            <div className="border-t border-gray-100 pt-2 text-sm text-gray-500">
              Total de estudiantes activos:{" "}
              <span className="font-semibold text-gray-800">{total}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-gray-600">{label}</span>
      <span className="ml-auto pl-4 text-lg font-bold text-gray-800">
        {value}
      </span>
    </div>
  );
}
