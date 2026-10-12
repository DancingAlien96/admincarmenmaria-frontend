"use client";

// Recibos electrónicos (FEL): chip de estado, acciones por pago, modal para
// emitir y modal de detalle con los datos del DTE y el QR de verificación.

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Ban, Download, FileText, RefreshCw, Send, X } from "lucide-react";
import { api, ApiError, apiUrl } from "@/lib/api";
import { FEL_STATUS_LABELS, FEL_STATUS_STYLES, formatGTQ } from "@/lib/labels";
import type { FelStatus, FelStatusInfo, FelReceipt } from "@/lib/types";

// --- Estado de la integración (se consulta una vez por sesión) --------------

let felEstadoCache: FelStatusInfo | null = null;
let felEstadoPromise: Promise<FelStatusInfo> | null = null;

export function useFelStatus(): FelStatusInfo | null {
  const [estado, setEstado] = useState<FelStatusInfo | null>(felEstadoCache);
  useEffect(() => {
    if (felEstadoCache) return;
    felEstadoPromise ??= api<FelStatusInfo>("/api/fel/status").then((r) => {
      felEstadoCache = r;
      return r;
    });
    felEstadoPromise.then(setEstado).catch(() => setEstado(null));
  }, []);
  return estado;
}

export function invalidateFelStatus() {
  felEstadoCache = null;
  felEstadoPromise = null;
}

// --- Utilidades --------------------------------------------------------------

export function urlVerificacionSat(r: {
  authorizationNumber: string | null;
  issuerNit: string;
  receiverTaxId: string;
  grandTotal: number;
}): string {
  return (
    "https://felpub.c.sat.gob.gt/verificador-web/publico/vistas/verificacionDte.jsf" +
    `?tipo=autorizacion&numero=${(r.authorizationNumber ?? "").toUpperCase()}` +
    `&emisor=${r.issuerNit}&receptor=${r.receiverTaxId}&monto=${r.grandTotal.toFixed(2)}`
  );
}

export function fmtFechaHora(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

type FelMin = {
  id: string;
  status: FelStatus;
  series: string | null;
  number: string | null;
  error?: string | null;
};

// Chip con el estado del recibo (serie-número cuando está certificado)
export function FelBadge({
  fel,
  onClick,
}: {
  fel: FelMin | null | undefined;
  onClick?: () => void;
}) {
  if (!fel) return null;
  const label =
    fel.status === "CERTIFIED" && fel.number
      ? `FEL ${fel.series ?? ""}-${fel.number}`
      : `FEL · ${FEL_STATUS_LABELS[fel.status]}`;
  const cls = `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${FEL_STATUS_STYLES[fel.status]}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:opacity-80`} title={fel.error ?? undefined}>
      {label}
    </button>
  ) : (
    <span className={cls} title={fel.error ?? undefined}>
      {label}
    </span>
  );
}

// --- Acciones por pago --------------------------------------------------------

export interface PagoParaFel {
  id: string;
  concept: string;
  net: number;
  status: string;
  student?: { fullName: string; taxId?: string | null; email?: string | null } | null;
  payerName?: string | null;
  payerEmail?: string | null;
}

// Botón/chip del recibo FEL de un pago: ver el recibo, reintentar o emitir.
export function FelAcciones({
  payment,
  fel,
  canEdit,
  onChanged,
  compact,
}: {
  payment: PagoParaFel;
  fel: FelMin | null | undefined;
  canEdit: boolean;
  onChanged: () => void | Promise<void>;
  compact?: boolean;
}) {
  const estado = useFelStatus();
  const [verId, setVerId] = useState<string | null>(null);
  const [emitir, setEmitir] = useState(false);

  const puedeEmitir =
    canEdit &&
    payment.status === "ACTIVO" &&
    Boolean(estado?.configured && estado?.enabled) &&
    (!fel || fel.status === "VOIDED" || fel.status === "ERROR");

  return (
    <>
      {fel && <FelBadge fel={fel} onClick={() => setVerId(fel.id)} />}
      {puedeEmitir && (
        <button
          type="button"
          onClick={() => setEmitir(true)}
          className={
            compact
              ? "text-xs font-medium text-emerald-700 hover:underline"
              : "rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          }
        >
          {fel?.status === "ERROR" ? "Reintentar FEL" : fel?.status === "VOIDED" ? "Nuevo recibo FEL" : "Emitir recibo FEL"}
        </button>
      )}
      {verId && (
        <ReciboModal
          reciboId={verId}
          canEdit={canEdit}
          onClose={() => setVerId(null)}
          onChanged={onChanged}
          onReintentar={() => {
            setVerId(null);
            setEmitir(true);
          }}
        />
      )}
      {emitir && (
        <EmitirReciboModal
          payment={payment}
          onClose={() => setEmitir(false)}
          onDone={async () => {
            setEmitir(false);
            await onChanged();
          }}
        />
      )}
    </>
  );
}

// --- Emitir ------------------------------------------------------------------

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function EmitirReciboModal({
  payment,
  onClose,
  onDone,
}: {
  payment: PagoParaFel;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [receptorId, setReceptorId] = useState(payment.student?.taxId ?? "CF");
  const [receptorNombre, setReceptorNombre] = useState(
    payment.student?.fullName ?? payment.payerName ?? ""
  );
  const [receptorCorreo, setReceptorCorreo] = useState(
    payment.student?.email ?? payment.payerEmail ?? ""
  );
  const [descripcion, setDescripcion] = useState(payment.concept);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/fel/payments/${payment.id}/issue`, {
        method: "POST",
        body: {
          receiverTaxId: receptorId.trim() || "CF",
          receiverName: receptorNombre.trim() || undefined,
          receiverEmail: receptorCorreo.trim(),
          description: descripcion.trim() || undefined,
        },
      });
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo emitir el recibo");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-brand-800">Emitir recibo electrónico</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Se certificará ante la SAT un recibo (RECI) por <strong>{formatGTQ(payment.net)}</strong>.
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Identificación Fiscal del receptor (NIT o CUI)</span>
            <input
              className={inputClass}
              value={receptorId}
              onChange={(e) => setReceptorId(e.target.value)}
              placeholder="CF"
            />
            <span className="mt-1 block text-xs text-gray-400">
              Escribe CF para consumidor final.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Nombre del receptor</span>
            <input
              className={inputClass}
              value={receptorNombre}
              onChange={(e) => setReceptorNombre(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Correo (recibe el recibo)</span>
            <input
              type="email"
              className={inputClass}
              value={receptorCorreo}
              onChange={(e) => setReceptorCorreo(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Descripción</span>
            <input
              className={inputClass}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Certificando…" : "Emitir y certificar"}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Detalle -----------------------------------------------------------------

export function ReciboModal({
  reciboId,
  canEdit,
  onClose,
  onChanged,
  onReintentar,
}: {
  reciboId: string;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onReintentar?: () => void;
}) {
  const [recibo, setRecibo] = useState<FelReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  // Se incrementa para volver a cargar el recibo (tras anular, etc.)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    api<{ receipt: FelReceipt }>(`/api/fel/receipts/${reciboId}`)
      .then((r) => {
        if (activo) setRecibo(r.receipt);
      })
      .catch((err) => {
        if (activo) setError(err instanceof ApiError ? err.message : "No se pudo cargar el recibo");
      });
    return () => {
      activo = false;
    };
  }, [reciboId, version]);

  const load = useCallback(async () => setVersion((v) => v + 1), []);

  async function anular() {
    if (!recibo || motivo.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/fel/receipts/${recibo.id}/void`, { method: "POST", body: { reason: motivo } });
      setAnulando(false);
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo anular el recibo");
    } finally {
      setBusy(false);
    }
  }

  async function reenviar() {
    if (!recibo) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await api<{ sent: boolean }>(`/api/fel/receipts/${recibo.id}/send`, { method: "POST" });
      setNotice(r.sent ? "Correo enviado." : "No se envió: el receptor no tiene correo o el correo no está configurado.");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "No se pudo enviar");
    } finally {
      setBusy(false);
    }
  }

  const tipoLabel = recibo?.receiverTaxIdType === "CUI" ? "CUI" : "NIT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-brand-800">Recibo electrónico (FEL)</h3>
            {recibo && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${FEL_STATUS_STYLES[recibo.status]}`}>
                {FEL_STATUS_LABELS[recibo.status]}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        {notice && (
          <div className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</div>
        )}

        {!recibo ? (
          <p className="text-gray-400">Cargando…</p>
        ) : (
          <>
            {recibo.status === "ERROR" && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-medium">La certificación falló</p>
                <p className="mt-1 break-words text-xs">{recibo.error}</p>
                {canEdit && onReintentar && recibo.payment.status === "ACTIVO" && (
                  <button
                    type="button"
                    onClick={onReintentar}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Reintentar
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-gray-500">Autorización</dt>
                <dd className="break-all font-medium text-gray-800">{recibo.authorizationNumber ?? "—"}</dd>
                <dt className="text-gray-500">Serie / Número</dt>
                <dd className="text-gray-800">{recibo.series ?? "—"} · {recibo.number ?? "—"}</dd>
                <dt className="text-gray-500">Emisión</dt>
                <dd className="text-gray-800">{fmtFechaHora(recibo.emittedAt)}</dd>
                <dt className="text-gray-500">Certificación</dt>
                <dd className="text-gray-800">{fmtFechaHora(recibo.certifiedAt)}</dd>
                <dt className="text-gray-500">Emisor</dt>
                <dd className="text-gray-800">NIT {recibo.issuerNit} · Est. {recibo.issuerEstablishmentCode}</dd>
                <dt className="text-gray-500">Receptor</dt>
                <dd className="text-gray-800">
                  {tipoLabel} {recibo.receiverTaxId} · {recibo.receiverName}
                  {recibo.receiverEmail && <span className="block text-xs text-gray-400">{recibo.receiverEmail}</span>}
                </dd>
                <dt className="text-gray-500">Pago</dt>
                <dd className="text-gray-800">
                  {recibo.payment.concept}
                  {recibo.payment.student && (
                    <span className="block text-xs text-gray-400">
                      {recibo.payment.student.fullName}
                      {recibo.payment.student.expedienteNumber ? ` · ${recibo.payment.student.expedienteNumber}` : ""}
                    </span>
                  )}
                </dd>
                <dt className="text-gray-500">Total</dt>
                <dd className="text-base font-bold text-gray-900">{formatGTQ(recibo.grandTotal)}</dd>
                {recibo.status === "VOIDED" && (
                  <>
                    <dt className="text-gray-500">Anulado</dt>
                    <dd className="text-red-700">
                      {fmtFechaHora(recibo.voidedAt)}
                      {recibo.voidReason ? ` · ${recibo.voidReason}` : ""}
                      {recibo.voidedBy?.name ? ` · ${recibo.voidedBy.name}` : ""}
                    </dd>
                  </>
                )}
              </dl>

              {recibo.authorizationNumber && (
                <a
                  href={urlVerificacionSat(recibo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 self-start rounded-lg border border-gray-200 p-2 text-[11px] text-brand-700 hover:bg-gray-50"
                  title="Verificar en el portal de la SAT"
                >
                  <QRCodeSVG value={urlVerificacionSat(recibo)} size={120} />
                  Verificar en SAT
                </a>
              )}
            </div>

            {recibo.items.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recibo.items.map((it) => (
                    <tr key={it.position}>
                      <td className="px-3 py-2 text-gray-800">{it.description}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{it.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatGTQ(it.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">{formatGTQ(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {recibo.status !== "ERROR" && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                <a
                  href={`${apiUrl}/api/fel/receipts/${recibo.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  <FileText aria-hidden className="h-3.5 w-3.5" /> PDF del recibo
                </a>
                {recibo.hasXml && (
                  <a
                    href={`${apiUrl}/api/fel/receipts/${recibo.id}/xml`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download aria-hidden className="h-3.5 w-3.5" /> XML
                  </a>
                )}
                {canEdit && recibo.status === "CERTIFIED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void reenviar()}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Send aria-hidden className="h-3.5 w-3.5" /> Reenviar correo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnulando((v) => !v)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 sm:ml-auto"
                    >
                      <Ban aria-hidden className="h-3.5 w-3.5" /> Anular ante SAT
                    </button>
                  </>
                )}
              </div>
            )}

            {anulando && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-sm text-red-800">
                  El recibo se anulará ante la SAT. El pago seguirá activo y podrás emitir un nuevo recibo.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo de la anulación"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void anular()}
                    disabled={busy || motivo.trim().length < 3}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {busy ? "Anulando…" : "Confirmar anulación"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
