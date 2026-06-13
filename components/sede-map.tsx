"use client";

import { useState } from "react";
import { formatGTQ } from "@/lib/labels";
import { GT_MAP } from "@/lib/guatemala-map";
import type { OverviewData } from "@/lib/types";

type Metric = "students" | "income" | "enrollments";

const METRICS: { key: Metric; label: string }[] = [
  { key: "students", label: "Estudiantes" },
  { key: "income", label: "Ingresos" },
  { key: "enrollments", label: "Inscripciones" },
];

// Color por sede (estable, no depende del valor)
const SEDE_COLOR: Record<string, string> = {
  Chiquimula: "#2563eb",
  "Morales Izabal": "#059669",
};
const DEFAULT_COLOR = "#7c3aed";

const SIN_SEDE = "Sin especificar";

export function SedeMap({ data }: { data: OverviewData }) {
  const [metric, setMetric] = useState<Metric>("students");

  // Valor por sede para la métrica activa
  const valueBySede = new Map<string, number>();
  const rows =
    metric === "students"
      ? data.studentsBySede.map((s) => ({ sede: s.sede, v: s.count }))
      : metric === "enrollments"
        ? data.enrollmentsBySede.map((s) => ({ sede: s.sede, v: s.count }))
        : data.incomeBySede.map((s) => ({ sede: s.sede, v: s.total }));
  for (const r of rows) valueBySede.set(r.sede, r.v);

  const fmt = (v: number) =>
    metric === "income" ? formatGTQ(v) : String(v);

  // Sedes que sí tienen ubicación en el mapa
  const located = Object.keys(GT_MAP.sedes);
  const maxVal = Math.max(
    1,
    ...located.map((s) => valueBySede.get(s) ?? 0)
  );

  // Radio proporcional al área (sqrt del valor)
  const R_MIN = 26;
  const R_MAX = 78;
  const radius = (v: number) => {
    if (v <= 0) return 0;
    return R_MIN + (Math.sqrt(v) / Math.sqrt(maxVal)) * (R_MAX - R_MIN);
  };

  const sinSede = valueBySede.get(SIN_SEDE) ?? 0;
  const total = rows.reduce((s, r) => s + r.v, 0);

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase text-gray-500">
          Demografía por sede
        </h2>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                metric === m.key
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Mapa */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <svg
            viewBox={GT_MAP.viewBox}
            className="mx-auto h-auto w-full max-w-xl"
            role="img"
            aria-label="Mapa de Guatemala con las sedes"
          >
            {/* Contorno del país */}
            <path
              d={GT_MAP.path}
              fill="#eef2f7"
              stroke="#c4ccd6"
              strokeWidth={3}
              strokeLinejoin="round"
            />

            {/* Burbujas por sede */}
            {located.map((sede) => {
              const pos = GT_MAP.sedes[sede]!;
              const v = valueBySede.get(sede) ?? 0;
              const r = radius(v);
              const color = SEDE_COLOR[sede] ?? DEFAULT_COLOR;
              return (
                <g key={sede}>
                  <title>{`${sede}: ${fmt(v)}`}</title>
                  {r > 0 && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill={color}
                      fillOpacity={0.35}
                      stroke={color}
                      strokeWidth={3}
                    />
                  )}
                  <circle cx={pos.x} cy={pos.y} r={6} fill={color} />
                </g>
              );
            })}

            {/* Etiquetas (después de las burbujas para que queden encima) */}
            {located.map((sede) => {
              const pos = GT_MAP.sedes[sede]!;
              const v = valueBySede.get(sede) ?? 0;
              const color = SEDE_COLOR[sede] ?? DEFAULT_COLOR;
              return (
                <g key={sede} style={{ pointerEvents: "none" }}>
                  <text
                    x={pos.x}
                    y={pos.y - radius(v) - 14}
                    textAnchor="middle"
                    fontSize={30}
                    fontWeight={700}
                    fill="#1f2937"
                  >
                    {sede}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y - radius(v) + 16}
                    textAnchor="middle"
                    fontSize={34}
                    fontWeight={800}
                    fill={color}
                  >
                    {fmt(v)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Leyenda / resumen */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-brand-800">
            {METRICS.find((m) => m.key === metric)!.label} por sede
            {metric !== "students" ? ` (${data.year})` : ""}
          </h3>
          <ul className="space-y-2.5">
            {located.map((sede) => {
              const v = valueBySede.get(sede) ?? 0;
              const color = SEDE_COLOR[sede] ?? DEFAULT_COLOR;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return (
                <li key={sede} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-600">{sede}</span>
                  <span className="ml-auto font-semibold text-gray-800">
                    {fmt(v)}
                  </span>
                  <span className="w-9 text-right text-xs text-gray-400">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>

          {sinSede > 0 && (
            <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Sin sede asignada:{" "}
              <span className="font-semibold text-gray-700">
                {fmt(sinSede)}
              </span>
              . Asigna la sede en el expediente del estudiante para que se
              refleje aquí.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
