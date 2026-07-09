"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  canAccess,
  formatGTQ,
  PAYMENT_METHOD_LABELS,
  PAYMENT_SOURCE_LABELS,
} from "@/lib/labels";
import type {
  FeeType,
  Pagination,
  Payment,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  PaymentTotals,
} from "@/lib/types";
import { RegisterPaymentForm } from "@/components/register-payment-form";

export default function PaymentsPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "PAYMENTS", "EDITOR");

  const [source, setSource] = useState<PaymentSource | "">("");
  const [status, setStatus] = useState<PaymentStatus | "">("ACTIVO");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [unlinked, setUnlinked] = useState(false);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [totals, setTotals] = useState<PaymentTotals | null>(null);
  const [fees, setFees] = useState<FeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (source) params.set("source", source);
      if (status) params.set("status", status);
      if (method) params.set("method", method);
      if (unlinked) params.set("unlinked", "true");
      params.set("page", String(page));
      const res = await api<{
        data: Payment[];
        pagination: Pagination;
        totals: PaymentTotals;
      }>(`/api/payments?${params.toString()}`);
      setItems(res.data);
      setPagination(res.pagination);
      setTotals(res.totals);
    } finally {
      setLoading(false);
    }
  }, [source, status, method, unlinked, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api<{ fees: FeeType[] }>("/api/fees").then((r) => setFees(r.fees));
  }, []);

  async function sync() {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await api<{
        imported: number;
        updated: number;
        skipped: number;
      }>("/api/payments/sync", { method: "POST" });
      setNotice(
        `Sincronización lista: ${res.imported} nuevos, ${res.updated} actualizados.`
      );
      await load();
    } catch (err) {
      setNotice(
        err instanceof ApiError ? err.message : "Error al sincronizar"
      );
    } finally {
      setSyncing(false);
    }
  }

  async function annul(p: Payment) {
    const reason = prompt(`Motivo de anulación para "${p.concept}":`);
    if (!reason) return;
    await api(`/api/payments/${p.id}/annul`, {
      method: "POST",
      body: { reason },
    });
    await load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Control de Pagos</h1>
          <p className="text-sm text-gray-500">
            Pagos de la tienda en línea y registros manuales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/panel/pagos/cuotas"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Configurar cuotas
          </Link>
          {canEdit && (
            <>
              <Link
                href="/panel/pagos/vincular"
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                Vincular pagos
              </Link>
              <button
                onClick={() => void sync()}
                disabled={syncing}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              >
                {syncing ? "Sincronizando…" : "Sincronizar tienda"}
              </button>
              <button
                onClick={() => setShowForm((s) => !s)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                + Registrar pago
              </button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {notice}
        </p>
      )}

      {/* Resumen de totales */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Ingreso neto (filtro actual)"
          value={totals ? formatGTQ(totals.net) : "—"}
          highlight
        />
        <SummaryCard
          label="Monto bruto"
          value={totals ? formatGTQ(totals.gross) : "—"}
        />
        <SummaryCard
          label="Descuentos / becas"
          value={totals ? formatGTQ(totals.discount) : "—"}
        />
      </div>

      {showForm && canEdit && (
        <div className="mb-6">
          <RegisterPaymentForm
            fees={fees}
            onCreated={async () => {
              setShowForm(false);
              await load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PaymentStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="ANULADO">Anulados</option>
        </select>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value as PaymentSource | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los orígenes</option>
          <option value="MANUAL">Manual</option>
          <option value="WOOCOMMERCE">Tienda en línea</option>
        </select>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as PaymentMethod | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los métodos</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="DEPOSITO">Depósito</option>
          <option value="TARJETA">Tarjeta</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={unlinked}
            onChange={(e) => {
              setUnlinked(e.target.checked);
              setPage(1);
            }}
          />
          Sin vincular a estudiante
        </label>
      </div>

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Estudiante / Pagador</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3 text-right">Neto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No hay pagos que coincidan.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className={p.status === "ANULADO" ? "opacity-50" : ""}
                >
                  <td className="px-4 py-3 text-gray-600">
                    {p.paidAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{p.concept}</td>
                  <td className="px-4 py-3">
                    {p.student ? (
                      <Link
                        href={`/panel/estudiantes/detalle?id=${p.student.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {p.student.fullName}
                      </Link>
                    ) : (
                      <span className="text-gray-500">
                        {p.payerName ?? "—"}
                        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                          sin vincular
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {PAYMENT_METHOD_LABELS[p.method]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {PAYMENT_SOURCE_LABELS[p.source]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {formatGTQ(p.net)}
                    {p.discount > 0 && (
                      <span className="block text-[10px] text-gray-400">
                        bruto {formatGTQ(p.amount)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.status === "ACTIVO"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {p.status === "ACTIVO" ? "Activo" : "Anulado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`${apiUrl}/api/payments/${p.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Recibo
                      </a>
                      {canEdit && p.status === "ACTIVO" && (
                        <button
                          onClick={() => void annul(p)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-gray-400">
            No hay pagos que coincidan.
          </p>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border border-gray-200 bg-white p-4 ${
                p.status === "ANULADO" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-800">{p.concept}</span>
                <span className="shrink-0 text-right font-bold text-gray-800">
                  {formatGTQ(p.net)}
                </span>
              </div>
              <div className="mt-1 text-sm">
                {p.student ? (
                  <Link
                    href={`/panel/estudiantes/detalle?id=${p.student.id}`}
                    className="text-brand-700 hover:underline"
                  >
                    {p.student.fullName}
                  </Link>
                ) : (
                  <span className="text-gray-500">
                    {p.payerName ?? "—"}
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                      sin vincular
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{p.paidAt.slice(0, 10)}</span>
                <span>·</span>
                <span>{PAYMENT_METHOD_LABELS[p.method]}</span>
                <span>·</span>
                <span>{PAYMENT_SOURCE_LABELS[p.source]}</span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    p.status === "ACTIVO"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {p.status === "ACTIVO" ? "Activo" : "Anulado"}
                </span>
              </div>
              <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3">
                <a
                  href={`${apiUrl}/api/payments/${p.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Recibo
                </a>
                {canEdit && p.status === "ACTIVO" && (
                  <button
                    onClick={() => void annul(p)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Anular
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {pagination.page} de {pagination.totalPages} ·{" "}
            {pagination.total} pagos
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-brand-200 bg-brand-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          highlight ? "text-brand-800" : "text-gray-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
