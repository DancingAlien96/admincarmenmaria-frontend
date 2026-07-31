"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatGTQ, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { PortalDashboard, PaymentMethod } from "@/lib/types";

export default function PortalPagosPage() {
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PortalDashboard>("/api/portal/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tus pagos…</p>;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">Mis pagos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Historial de pagos registrados a tu nombre.
      </p>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500">Total pagado</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {formatGTQ(data.totalPagado)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {data.pagosRealizados} pago(s)
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500">
            Mensualidad de {data.mesActual}
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              data.mensualidadPagada ? "text-green-700" : "text-amber-600"
            }`}
          >
            {data.mensualidadPagada ? "Pagada" : "Pendiente"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Aún no tienes pagos registrados.
                </td>
              </tr>
            ) : (
              data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-gray-600">
                    {p.paidAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.concept}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {formatGTQ(p.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
