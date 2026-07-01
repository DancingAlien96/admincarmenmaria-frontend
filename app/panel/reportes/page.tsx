"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiUrl } from "@/lib/api";
import type { ReportData } from "@/lib/types";

type ReportType =
  | "resumen"
  | "cobranza"
  | "mora"
  | "estudiantes"
  | "egresados"
  | "sedes";

type FilterKey = "period" | "sede" | "status" | "year";

const REPORTS: {
  key: ReportType;
  title: string;
  desc: string;
  filters: FilterKey[];
}[] = [
  { key: "resumen", title: "Resumen Ejecutivo", desc: "Panorama general del periodo", filters: ["period"] },
  { key: "cobranza", title: "Cobranza / Ingresos por mes", desc: "Cobrado vs esperado y tendencia", filters: ["period"] },
  { key: "mora", title: "Estudiantes en mora", desc: "Cuotas pendientes vencidas", filters: ["sede"] },
  { key: "estudiantes", title: "Listado de estudiantes", desc: "Expedientes por sede, estado y año", filters: ["sede", "status", "year"] },
  { key: "egresados", title: "Egresados / Diplomas", desc: "Listado de egresados por año", filters: ["year"] },
  { key: "sedes", title: "Reporte por sede", desc: "Comparativo Chiquimula vs Izabal", filters: ["period"] },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function monthStart() {
  const n = new Date();
  return `${n.getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const [type, setType] = useState<ReportType>("resumen");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [sede, setSede] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const current = REPORTS.find((r) => r.key === type)!;

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ type });
    if (current.filters.includes("period")) {
      p.set("from", from);
      p.set("to", to);
    }
    if (current.filters.includes("sede") && sede) p.set("sede", sede);
    if (current.filters.includes("status") && status) p.set("status", status);
    if (current.filters.includes("year") && year) p.set("year", year);
    return p.toString();
  }, [type, from, to, sede, status, year, current]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<ReportData>(`/api/reports?${queryString}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const exportUrl = (format: "pdf" | "xlsx") =>
    `${apiUrl}/api/reports?${queryString}&format=${format}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">Reportes</h1>
        <p className="text-sm text-gray-500">
          Genera y exporta reportes del sistema de la academia.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Configuración */}
        <div className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500">
              Tipo de reporte
            </h2>
            <div className="space-y-2">
              {REPORTS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setType(r.key)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                    type === r.key
                      ? "border-brand-400 bg-brand-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium text-brand-800">{r.title}</p>
                  <p className="text-xs text-gray-500">{r.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Filtros del reporte activo */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500">
              Filtros
            </h2>
            <div className="space-y-3">
              {current.filters.includes("period") && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Desde</label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Hasta</label>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
              {current.filters.includes("sede") && (
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Sede</label>
                  <select value={sede} onChange={(e) => setSede(e.target.value)} className={inputClass}>
                    <option value="">Todas</option>
                    <option value="Chiquimula">Chiquimula</option>
                    <option value="Morales Izabal">Morales Izabal</option>
                  </select>
                </div>
              )}
              {current.filters.includes("status") && (
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Estado</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                    <option value="">Todos</option>
                    <option value="ACTIVO">Activos</option>
                    <option value="EGRESADO">Egresados</option>
                    <option value="BAJA">De baja</option>
                  </select>
                </div>
              )}
              {current.filters.includes("year") && (
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Año</label>
                  <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} placeholder="Todos" />
                </div>
              )}
              {current.filters.length === 0 && (
                <p className="text-sm text-gray-400">Sin filtros.</p>
              )}
            </div>
          </section>

          {/* Exportación */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500">
              Exportar
            </h2>
            <div className="flex gap-2">
              <a href={exportUrl("pdf")} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-700">
                PDF
              </a>
              <a href={exportUrl("xlsx")} className="flex-1 rounded-lg border border-brand-300 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
                Excel
              </a>
            </div>
          </section>
        </div>

        {/* Vista previa */}
        <div>
          <p className="mb-2 text-sm text-gray-400">
            Vista previa del documento que se generará al descargar.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {loading || !data ? (
              <p className="text-gray-400">Generando vista previa…</p>
            ) : (
              <Preview data={data} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Preview({ data }: { data: ReportData }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-brand-800">{data.title}</h2>
      {data.subtitle && <p className="text-sm text-gray-500">{data.subtitle}</p>}
      {data.periodLabel && (
        <p className="text-xs text-gray-400">Periodo: {data.periodLabel}</p>
      )}

      {data.kpis && data.kpis.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] uppercase text-gray-500">{k.label}</p>
              <p className="mt-1 font-bold text-brand-800">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {data.tables.map((t, ti) => (
        <div key={ti} className="mt-6 overflow-x-auto">
          {t.title && (
            <h3 className="mb-2 font-semibold text-brand-800">{t.title}</h3>
          )}
          <table className="w-full text-sm">
            <thead className="bg-brand-800 text-left text-xs text-white">
              <tr>
                {t.columns.map((c, i) => (
                  <th key={i} className={`px-3 py-2 ${i === 0 ? "" : "text-right"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {t.rows.length === 0 ? (
                <tr>
                  <td colSpan={t.columns.length} className="px-3 py-6 text-center text-gray-400">
                    Sin datos para este periodo/filtro.
                  </td>
                </tr>
              ) : (
                t.rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, ci) => (
                      <td key={ci} className={`px-3 py-1.5 ${ci === 0 ? "text-gray-700" : "text-right text-gray-600"}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {t.totals && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold text-brand-800">
                  {t.totals.map((c, ci) => (
                    <td key={ci} className={`px-3 py-2 ${ci === 0 ? "" : "text-right"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ))}
    </div>
  );
}
