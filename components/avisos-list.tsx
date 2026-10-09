"use client";

import {
  ClipboardCheck,
  FileCheck,
  FileText,
  Megaphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MisAvisos } from "@/lib/types";

const ICONOS: Record<string, LucideIcon> = {
  general: Megaphone,
  pago: Wallet,
  matricula: FileText,
  documento: FileCheck,
  calificacion: ClipboardCheck,
};

function fmtFecha(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guatemala",
  }).format(new Date(iso));
}

// Avisos recibidos (de la escuela y automáticos), con marca de leído.
export function AvisosList({
  emptyText,
  onChange,
}: {
  emptyText: string;
  onChange?: () => void; // p. ej. refrescar el contador de la campanita
}) {
  const [data, setData] = useState<MisAvisos | null>(null);

  const load = useCallback(() => {
    api<MisAvisos>("/api/avisos/mios").then(setData).catch(() => setData({ noLeidos: 0, items: [] }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function leer(id?: string) {
    await api("/api/avisos/mios/leidos", { method: "POST", body: id ? { id } : {} }).catch(
      () => undefined
    );
    onChange?.();
    setData((d) =>
      d
        ? {
            noLeidos: id ? Math.max(0, d.noLeidos - 1) : 0,
            items: d.items.map((i) => (!id || i.id === id ? { ...i, leido: true } : i)),
          }
        : d
    );
  }

  if (!data) return <p className="text-sm text-gray-400">Cargando avisos…</p>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">
          Avisos{" "}
          {data.noLeidos > 0 && (
            <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {data.noLeidos} nuevo{data.noLeidos === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        {data.noLeidos > 0 && (
          <button
            onClick={() => void leer()}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Marcar todos como leídos
          </button>
        )}
      </div>
      {data.items.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.items.map((a) => {
            const Icon = ICONOS[a.tipo] ?? Megaphone;
            // Solo rutas internas o https (el servidor ya lo valida; doble control)
            const url = a.url && (/^\/(?!\/)/.test(a.url) || /^https:\/\//i.test(a.url)) ? a.url : null;
            const externo = url?.startsWith("https://");
            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  a.leido ? "border-gray-200 bg-white" : "border-brand-200 bg-brand-50/60"
                }`}
              >
                <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className={`text-gray-800 ${a.leido ? "font-medium" : "font-semibold"}`}>
                    {a.titulo}
                  </p>
                  <p className="whitespace-pre-line text-sm text-gray-600">{a.mensaje}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-gray-400">{fmtFecha(a.fecha)}</span>
                    {url &&
                      (externo ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => !a.leido && void leer(a.id)}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          Abrir enlace
                        </a>
                      ) : (
                        <Link
                          href={url}
                          onClick={() => !a.leido && void leer(a.id)}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          Ver
                        </Link>
                      ))}
                    {!a.leido && (
                      <button
                        onClick={() => void leer(a.id)}
                        className="text-gray-500 hover:text-brand-700 hover:underline"
                      >
                        Marcar como leído
                      </button>
                    )}
                  </div>
                </div>
                {!a.leido && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
