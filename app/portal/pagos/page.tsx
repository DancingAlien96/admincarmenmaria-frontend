"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatGTQ } from "@/lib/labels";
import type { CuotaEstado, PortalCuotas } from "@/lib/types";

const ESTADO_META: Record<
  CuotaEstado,
  { label: string; badge: string; dot: string }
> = {
  pagado: {
    label: "Pagado",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  parcial: {
    label: "Pago parcial",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  vencido: {
    label: "Vencido",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  pendiente: {
    label: "Pendiente",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-300",
  },
};

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export default function PortalPagosPage() {
  const [data, setData] = useState<PortalCuotas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PortalCuotas>("/api/portal/cuotas")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tu plan de cuotas…</p>;
  }

  const { cuotas, summary, progress } = data;
  const pct =
    progress.total > 0
      ? Math.round((progress.pagadas / progress.total) * 100)
      : 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">Mis pagos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Tu plan de cuotas y el estado de cada pago.
      </p>

      {cuotas.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Aún no tienes un plan de cuotas asignado.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            La administración de la escuela te lo asignará pronto.
          </p>
        </div>
      ) : (
        <>
          {/* Progreso */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Progreso de pagos
              </span>
              <span className="text-gray-500">
                {progress.pagadas} de {progress.total} cuotas · {pct}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs uppercase text-gray-500">Total pagado</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {formatGTQ(summary.totalPaid)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs uppercase text-gray-500">Saldo pendiente</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {formatGTQ(summary.totalDue)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs uppercase text-gray-500">En mora</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  summary.overdueAmount > 0 ? "text-red-600" : "text-gray-800"
                }`}
              >
                {formatGTQ(summary.overdueAmount)}
              </p>
            </div>
          </div>

          {/* Línea de tiempo de cuotas */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {cuotas.map((c) => {
                const meta = ESTADO_META[c.estado];
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">{c.concept}</p>
                      <p className="text-xs text-gray-400">
                        Vence: {fmtFecha(c.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        {formatGTQ(c.amount)}
                      </p>
                      {c.saldo > 0 && c.paid > 0 && (
                        <p className="text-xs text-gray-400">
                          Saldo: {formatGTQ(c.saldo)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            ¿Ya pagaste una cuota y aparece pendiente? Los pagos se reflejan
            cuando la administración los registra. Si tienes dudas, comunícate
            con la escuela.
          </p>
        </>
      )}
    </div>
  );
}
