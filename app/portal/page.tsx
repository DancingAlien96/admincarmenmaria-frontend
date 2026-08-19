"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatGTQ } from "@/lib/labels";
import type { PortalDashboard } from "@/lib/types";

export default function PortalDashboardPage() {
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PortalDashboard>("/api/portal/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tu información…</p>;
  }

  const s = data.student;
  const firstName = s.fullName.split(" ")[0];
  const statusLabel =
    s.status === "ACTIVO" ? "Activo" : s.status === "EGRESADO" ? "Egresado" : "Baja";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">
          Portal del Estudiante
        </h1>
        <p className="text-sm text-gray-500">
          Escuela Privada de Auxiliares de Enfermería Carmen María
        </p>
      </div>

      {/* Tarjeta de bienvenida */}
      <section className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        {s.photoUrl && (
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 sm:h-20 sm:w-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.photoUrl}
              alt={s.fullName}
              className="h-full w-full object-cover"
            />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-brand-800 sm:text-xl">
            Bienvenido/a, {firstName}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Expediente{" "}
            <span className="font-medium text-gray-700">
              {s.expedienteNumber ?? "—"}
            </span>
            {s.sede ? ` · Sede ${s.sede}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                s.status === "ACTIVO"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pagos realizados"
          value={String(data.pagosRealizados)}
          sub={`${formatGTQ(data.totalPagado)} en total`}
        />
        <StatCard
          label={`Mensualidad de ${data.mesActual}`}
          value={data.mensualidadPagada ? "Pagada" : "Pendiente"}
          sub={data.mensualidadPagada ? "Estás al día" : "Requiere tu atención"}
          tone={data.mensualidadPagada ? "green" : "amber"}
        />
        <StatCard
          label="Documentos entregados"
          value={String(data.documentos)}
          sub="en tu expediente"
        />
      </div>

      {/* Calificaciones */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 font-semibold text-brand-800">Mis calificaciones</h3>
        {data.grades.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aún no hay calificaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2">Fase / Acta</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2 text-right">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.grades.map((g, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 text-gray-700">{g.fase}</td>
                    <td className="py-2 pr-3 text-gray-500">
                      {g.date.slice(0, 10)}
                    </td>
                    <td className="py-2 text-right font-semibold text-brand-800">
                      {g.nota}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "brand",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "brand" | "green" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-green-700"
      : tone === "amber"
        ? "text-amber-600"
        : "text-brand-800";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
