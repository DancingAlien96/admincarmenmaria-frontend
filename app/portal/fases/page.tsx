"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  GRADE_CATEGORY_LABELS,
  FASE_ITEM_KIND_LABELS,
  type FaseContentItem,
  type FaseItem,
  type StudentFases,
} from "@/lib/types";

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

function FaseContenido({ items }: { items: FaseContentItem[] }) {
  if (items.length === 0) return null;
  const materiales = items.filter((i) => i.kind === "MATERIAL");
  const academicos = items.filter((i) => i.kind !== "MATERIAL");

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
      {academicos.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Tareas, actividades y exámenes
          </p>
          <ul className="space-y-1.5">
            {academicos.map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                  {FASE_ITEM_KIND_LABELS[it.kind]}
                </span>
                <div className="min-w-0">
                  <p className="text-gray-800">{it.title}</p>
                  {(it.date || it.meta) && (
                    <p className="text-xs text-gray-400">
                      {[it.date ? it.date.slice(0, 10) : null, it.meta]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {materiales.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Materiales
          </p>
          <ul className="space-y-1.5">
            {materiales.map((it) => (
              <li key={it.id} className="flex items-center gap-2 text-sm">
                <span>📎</span>
                <span className="min-w-0 flex-1 truncate text-gray-800">
                  {it.title}
                  {it.sizeLabel ? (
                    <span className="text-xs text-gray-400"> · {it.sizeLabel}</span>
                  ) : null}
                </span>
                {it.fileUrl && (
                  <a
                    href={it.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Descargar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PortalFasesPage() {
  const [data, setData] = useState<StudentFases | null>(null);
  const [content, setContent] = useState<FaseContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<StudentFases>("/api/portal/fases"),
      api<{ items: FaseContentItem[] }>("/api/fase-content").catch(() => ({
        items: [],
      })),
    ])
      .then(([f, c]) => {
        setData(f);
        setContent(c.items);
      })
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

      {!hayNotas && content.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-3xl">🎓</p>
          <p className="mt-2 text-gray-600">Aún no hay contenido en tus fases.</p>
          <p className="text-sm text-gray-400">
            Tus docentes irán publicando tareas, materiales y calificaciones aquí.
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

                <FaseContenido
                  items={content.filter((c) => c.fase === f.fase)}
                />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
