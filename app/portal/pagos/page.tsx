"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  Landmark,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api";
import { formatGTQ } from "@/lib/labels";
import type { CuotaEstado, PortalCuota, PortalCuotas } from "@/lib/types";

const ESTADO_META: Record<
  CuotaEstado,
  { label: string; chip: string; dot: string }
> = {
  pagado: {
    label: "Aprobado",
    chip: "bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  parcial: {
    label: "Pago parcial",
    chip: "bg-brand-50 text-brand-700",
    dot: "bg-brand-500",
  },
  en_revision: {
    label: "En revisión",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  vencido: {
    label: "Vencido",
    chip: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  pendiente: {
    label: "Pendiente",
    chip: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
};

function fmtFechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function PortalPagosPage() {
  const [data, setData] = useState<PortalCuotas | null>(null);
  const [loading, setLoading] = useState(true);
  const [boletaFor, setBoletaFor] = useState<PortalCuota | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  // Viene de la ficha de inscripción (paso 2: pagar el examen)
  const [desdeFicha, setDesdeFicha] = useState(false);
  // Volvió de la pasarela sin pagar (canceló)
  const [cancelado, setCancelado] = useState(false);

  async function reload() {
    const r = await api<PortalCuotas>("/api/portal/cuotas");
    setData(r);
    return r;
  }

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const examen = qs.get("examen") === "1";
    if (qs.get("cancelado") === "1") {
      setCancelado(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    reload()
      .then((r) => {
        if (!examen) return;
        setDesdeFicha(true);
        // Quita el parámetro para que al recargar no se vuelva a abrir
        window.history.replaceState(null, "", window.location.pathname);
        const porPagar = r.cuotas.find(
          (c) =>
            c.estado === "pendiente" ||
            c.estado === "vencido" ||
            c.estado === "parcial"
        );
        if (porPagar) setBoletaFor(porPagar);
      })
      .finally(() => setLoading(false));
  }, []);

  // Descarga el recibo PDF del pago aprobado de la cuota
  async function descargarComprobante(c: PortalCuota) {
    setDescargando(c.id);
    try {
      const res = await fetch(
        `${apiUrl}/api/portal/cuotas/${c.id}/comprobante`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "No se pudo descargar el comprobante");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Comprobante ${c.concept}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo descargar");
    } finally {
      setDescargando(null);
    }
  }

  if (loading || !data) {
    return <p className="text-gray-400">Cargando tu plan de cuotas…</p>;
  }

  const { cuotas, progress } = data;
  const pct =
    progress.total > 0
      ? Math.round((progress.pagadas / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {cancelado && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cancelaste el pago con tarjeta. No se te cobró nada; puedes
          intentarlo de nuevo cuando quieras.
        </div>
      )}

      {desdeFicha && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">¡Tu ficha fue recibida!</p>
          <p>
            Paso 2 de 2: paga tu examen de admisión con tarjeta o sube tu
            boleta. Si prefieres pagar después, entra al Campus cuando quieras.
          </p>
        </div>
      )}

      {cuotas.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <CircleDollarSign aria-hidden className="mx-auto h-9 w-9 text-gray-300" />
          <p className="mt-2 text-gray-600">
            Aún no tienes un plan de cuotas asignado.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            La administración de la escuela te lo asignará pronto.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Pagos completados
                </h2>
                <p className="text-sm text-gray-500">
                  {progress.pagadas} de {progress.total} pagos realizados
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  Aprobado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  En revisión
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                  Pendiente
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </section>

          {/* Línea de tiempo de cuotas */}
          <ol className="relative space-y-3">
            {/* Línea vertical */}
            <span
              aria-hidden
              className="absolute bottom-6 left-[9px] top-6 w-px bg-gray-200 sm:left-[11px]"
            />
            {cuotas.map((c, i) => {
              const meta = ESTADO_META[c.estado];
              const pagable =
                c.estado === "pendiente" ||
                c.estado === "vencido" ||
                c.estado === "parcial";
              return (
                <li key={c.id} className="relative flex gap-3 sm:gap-4">
                  {/* Marcador */}
                  <span className="relative z-10 mt-5 flex h-5 w-5 shrink-0 items-center justify-center sm:h-6 sm:w-6">
                    {c.estado === "pagado" ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                        <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : c.estado === "en_revision" ? (
                      <span className="h-4 w-4 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                    ) : (
                      <span
                        className={`h-4 w-4 rounded-full border-2 bg-white ${
                          c.estado === "vencido" ? "border-red-400" : "border-gray-300"
                        }`}
                      />
                    )}
                  </span>

                  {/* Tarjeta */}
                  <div
                    className={`flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:p-5 ${
                      c.estado === "en_revision"
                        ? "border-amber-200"
                        : c.estado === "vencido"
                          ? "border-red-200"
                          : "border-gray-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                          {/^admisi/i.test(cuotas[0]?.concept ?? "") ? i : i + 1}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {c.concept}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-lg font-bold text-gray-900">
                          {formatGTQ(c.amount)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                          Fecha límite: {fmtFechaLarga(c.dueDate)}
                        </span>
                        {c.saldo > 0 && c.paid > 0 && (
                          <span className="text-xs text-gray-500">
                            Saldo: {formatGTQ(c.saldo)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acción */}
                    <div className="shrink-0">
                      {c.estado === "pagado" ? (
                        <button
                          onClick={() => void descargarComprobante(c)}
                          disabled={descargando === c.id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60 sm:w-auto"
                        >
                          <Download aria-hidden className="h-4 w-4" />
                          {descargando === c.id ? "Descargando…" : "Descargar Comprobante"}
                        </button>
                      ) : c.estado === "en_revision" ? (
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 sm:w-auto">
                          <Clock aria-hidden className="h-4 w-4" />
                          Esperando validación
                        </span>
                      ) : pagable ? (
                        <button
                          onClick={() => setBoletaFor(c)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 sm:w-auto"
                        >
                          <Upload aria-hidden className="h-4 w-4" />
                          Registrar Pago
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="text-xs text-gray-400">
            Paga con tarjeta o sube la boleta de tu transferencia en la cuota
            correspondiente. Las boletas quedan <strong>en revisión</strong>{" "}
            hasta que la escuela las apruebe.
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
              <CreditCard aria-hidden className="h-6 w-6 shrink-0 text-brand-700" />
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
              <Landmark aria-hidden className="h-6 w-6 shrink-0 text-brand-700" />
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
                  <ArrowLeft aria-hidden className="mr-1 inline h-4 w-4 align-[-3px]" />Volver
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
