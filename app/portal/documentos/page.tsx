"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StudentChecklist } from "@/lib/types";

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export default function PortalDocumentosPage() {
  const [data, setData] = useState<StudentChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<StudentChecklist>("/api/portal/documentos")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tu documentación…</p>;
  }

  const pct =
    data.total > 0 ? Math.round((data.entregados / data.total) * 100) : 0;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Documentación
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Documentos requeridos para tu expediente y su estado de entrega.
      </p>

      {/* Progreso */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Documentos entregados</span>
          <span className="text-gray-500">
            {data.entregados} de {data.total} · {pct}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {data.items.map((it) => (
            <li
              key={it.requirementId}
              className="flex items-start gap-3 px-4 py-3.5"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  it.delivered
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {it.delivered ? "✓" : "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800">{it.name}</p>
                {it.notes && (
                  <p className="text-xs text-gray-500">{it.notes}</p>
                )}
                {it.delivered && it.receivedAt && (
                  <p className="text-xs text-gray-400">
                    Recibido: {fmtFecha(it.receivedAt)}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  it.delivered
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                {it.delivered ? "Entregado" : "Pendiente"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        El estado de cada documento lo registra la administración de la escuela.
        Si ya entregaste un documento que aparece pendiente, comunícate con la
        escuela.
      </p>
    </div>
  );
}
