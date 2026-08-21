"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GRADE_CATEGORY_LABELS, type FaseItem, type StudentFases } from "@/lib/types";

const ESTADO: Record<
  FaseItem["estado"],
  { label: string; badge: string }
> = {
  completado: { label: "Completada", badge: "bg-green-50 text-green-700 border-green-200" },
  "en-progreso": { label: "En progreso", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  pendiente: { label: "Pendiente", badge: "bg-gray-50 text-gray-500 border-gray-200" },
};

function notaColor(pct: number) {
  if (pct >= 90) return "text-green-700";
  if (pct >= 70) return "text-brand-700";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}

export default function PortalFasesPage() {
  const [data, setData] = useState<StudentFases | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<StudentFases>("/api/portal/fases")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tus fases…</p>;
  }

  const hayNotas = data.fases.some((f) => f.items.length > 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">
            Mis fases
          </h1>
          <p className="text-sm text-gray-500">
            Tu avance académico por fase y tus calificaciones.
          </p>
        </div>
        {data.promedioGeneral !== null && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center">
            <p className="text-xs uppercase text-gray-500">Promedio general</p>
            <p className={`text-2xl font-bold ${notaColor(data.promedioGeneral)}`}>
              {data.promedioGeneral}
            </p>
          </div>
        )}
      </div>

      {!hayNotas ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-3xl">🎓</p>
          <p className="mt-2 text-gray-600">Aún no tienes calificaciones registradas.</p>
          <p className="text-sm text-gray-400">
            Aparecerán aquí conforme tus docentes las ingresen.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.fases.map((f) => {
            const est = ESTADO[f.estado];
            return (
              <section
                key={f.fase}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="font-bold text-brand-800">
                      {f.nombre}{" "}
                      <span className="text-sm font-normal text-gray-400">
                        · {f.subtitulo}
                      </span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.promedio !== null && (
                      <span className={`text-lg font-bold ${notaColor(f.promedio)}`}>
                        {f.promedio}
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${est.badge}`}
                    >
                      {est.label}
                    </span>
                  </div>
                </div>

                {f.items.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-gray-400">
                    Sin calificaciones en esta fase todavía.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {f.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800">{it.name}</p>
                          <p className="text-xs text-gray-400">
                            {GRADE_CATEGORY_LABELS[it.category]}
                            {it.date ? ` · ${it.date.slice(0, 10)}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold ${notaColor(it.pct)}`}>
                            {it.score}
                          </span>
                          <span className="text-xs text-gray-400">
                            {" "}
                            / {it.maxScore}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
