"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api";
import { formatGTQ } from "@/lib/labels";
import type { CuotaEstado, PortalCuota, PortalCuotas } from "@/lib/types";

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
  en_revision: {
    label: "En revisión",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
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
  const [boletaFor, setBoletaFor] = useState<PortalCuota | null>(null);

  async function reload() {
    setData(await api<PortalCuotas>("/api/portal/cuotas"));
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
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
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Mis pagos
      </h1>
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
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">{c.concept}</p>
                      <p className="text-xs text-gray-400">
                        Vence: {fmtFecha(c.dueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="font-semibold text-gray-800">
                        {formatGTQ(c.amount)}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      {c.saldo > 0 && c.paid > 0 && (
                        <p className="text-xs text-gray-400">
                          Saldo: {formatGTQ(c.saldo)}
                        </p>
                      )}
                      {(c.estado === "pendiente" ||
                        c.estado === "vencido" ||
                        c.estado === "parcial") && (
                        <button
                          onClick={() => setBoletaFor(c)}
                          className="mt-1 rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                        >
                          Registrar Pago
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Sube la boleta de tu transferencia bancaria en la cuota
            correspondiente. Quedará <strong>en revisión</strong> hasta que la
            escuela la apruebe.
          </p>
        </>
      )}

      {boletaFor && (
        <RegistrarPagoModal
          cuota={boletaFor}
          cardEnabled={data.cardEnabled}
          onClose={() => setBoletaFor(null)}
          onDone={async () => {
            setBoletaFor(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function RegistrarPagoModal({
  cuota,
  cardEnabled,
  onClose,
  onDone,
}: {
  cuota: PortalCuota;
  cardEnabled: boolean;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"choose" | "transfer">(
    cardEnabled ? "choose" : "transfer"
  );
  const [amount, setAmount] = useState(String(cuota.saldo || cuota.amount));
  const [method, setMethod] = useState("TRANSFERENCIA");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pagarTarjeta() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ url: string }>(
        `/api/portal/cuotas/${cuota.id}/pay-card`,
        { method: "POST" }
      );
      // Redirige al checkout hospedado de Tilopay.
      window.location.href = r.url;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo iniciar el pago"
      );
      setBusy(false);
    }
  }

  async function enviarBoleta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Adjunta la foto o PDF de tu boleta.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`${apiUrl}/api/uploads`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!up.ok) throw new Error("No se pudo subir el archivo");
      const stored = (await up.json()) as { url: string; key: string };
      await api(`/api/portal/cuotas/${cuota.id}/boleta`, {
        method: "POST",
        body: {
          amount: Number(amount) || 0,
          method,
          receiptUrl: stored.url,
          receiptKey: stored.key,
        },
      });
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo enviar la boleta"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-brand-800">Registrar pago</h3>
        <p className="mb-4 text-sm text-gray-500">
          {cuota.concept} · {formatGTQ(cuota.saldo || cuota.amount)}
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => void pagarTarjeta()}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-left hover:bg-brand-100 disabled:opacity-60"
            >
              <span className="text-2xl">💳</span>
              <span>
                <span className="block font-medium text-brand-800">
                  {busy ? "Abriendo pago seguro…" : "Pagar con tarjeta"}
                </span>
                <span className="block text-xs text-gray-500">
                  Pago inmediato. La cuota queda pagada al aprobarse.
                </span>
              </span>
            </button>
            <button
              onClick={() => setMode("transfer")}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50"
            >
              <span className="text-2xl">🏦</span>
              <span>
                <span className="block font-medium text-gray-800">
                  Transferencia bancaria
                </span>
                <span className="block text-xs text-gray-500">
                  Sube tu boleta. Queda en revisión hasta que la escuela la
                  apruebe.
                </span>
              </span>
            </button>
            <div className="flex justify-end pt-1">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mode === "transfer" && (
          <form onSubmit={enviarBoleta} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Monto (Q)</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Método</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="DEPOSITO">Depósito</option>
                </select>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Boleta (foto o PDF)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
            <div className="flex justify-between gap-2 pt-1">
              {cardEnabled ? (
                <button
                  type="button"
                  onClick={() => setMode("choose")}
                  className="text-sm text-gray-500 hover:underline"
                >
                  ← Volver
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? "Enviando…" : "Enviar boleta"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
