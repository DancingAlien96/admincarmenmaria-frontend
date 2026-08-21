"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PortalNotif, PortalNotifs } from "@/lib/types";

const PRIO: Record<
  PortalNotif["prioridad"],
  { label: string; dot: string; badge: string }
> = {
  alta: {
    label: "Importante",
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-700",
  },
  media: {
    label: "Atención",
    dot: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  baja: {
    label: "Info",
    dot: "bg-gray-300",
    badge: "border-gray-200 bg-gray-50 text-gray-500",
  },
};

function fmtFecha(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function icono(tipo: PortalNotif["tipo"]) {
  return tipo === "pago" ? "💰" : "📄";
}

export default function PortalNotificacionesPage() {
  const [data, setData] = useState<PortalNotifs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PortalNotifs>("/api/portal/notificaciones")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tus notificaciones…</p>;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Notificaciones
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Avisos sobre tus cuotas y documentos.
      </p>

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-2 text-gray-600">¡Estás al día!</p>
          <p className="text-sm text-gray-400">
            No tienes cuotas próximas ni documentos pendientes.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((n) => {
            const p = PRIO[n.prioridad];
            return (
              <li
                key={n.id}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <span className="text-2xl leading-none">{icono(n.tipo)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-800">{n.titulo}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${p.badge}`}
                    >
                      {p.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{n.detalle}</p>
                  {n.fecha && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {fmtFecha(n.fecha)}
                    </p>
                  )}
                </div>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`} />
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Estos avisos se actualizan solos según tus cuotas y documentos. Si ya
        realizaste un pago o entregaste un documento, se quitará cuando la
        escuela lo registre.
      </p>
    </div>
  );
}
