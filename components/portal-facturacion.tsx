"use client";

import { Pencil, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { tipoDeTaxId, type TaxIdTipo } from "@/lib/nit";
import {
  BillingFields,
  billingError,
  billingFrom,
  type BillingValues,
} from "@/components/billing-fields";

interface Facturacion {
  taxId: string | null;
  billingName: string | null;
  billingAddress: string | null;
  billingEmail: string | null;
  fullName: string;
  email: string | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

// Portal · Pagos: a nombre de quién salen los recibos electrónicos del alumno.
export function PortalFacturacion() {
  const [data, setData] = useState<Facturacion | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<BillingValues | null>(null);
  const [tipo, setTipo] = useState<TaxIdTipo>("CF");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ facturacion: Facturacion }>("/api/portal/facturacion")
      .then((r) => setData(r.facturacion))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  function abrir() {
    if (!data) return;
    setForm(billingFrom(data));
    setTipo(tipoDeTaxId(data.taxId));
    setMsg(null);
    setEditando(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const err = billingError(form, tipo);
    if (err) {
      setMsg({ ok: false, text: err });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await api<{ facturacion: Facturacion }>("/api/portal/facturacion", {
        method: "PUT",
        body: form,
      });
      setData(r.facturacion);
      setEditando(false);
      setMsg({ ok: true, text: "Datos guardados. Se usarán en tus próximos recibos." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo guardar" });
    } finally {
      setSaving(false);
    }
  }

  const t = tipoDeTaxId(data.taxId);
  const resumen =
    t === "CF"
      ? `Consumidor final (CF) · ${data.fullName}`
      : `${t === "CUI" ? "DPI" : "NIT"} ${data.taxId} · ${data.billingName || data.fullName}`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ReceiptText aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-gray-900">Mis datos de facturación</h2>
            <p className="text-sm text-gray-500">A nombre de quién se emiten tus recibos electrónicos.</p>
            {!editando && <p className="mt-1 text-sm font-medium text-gray-800">{resumen}</p>}
          </div>
        </div>
        {!editando && (
          <button
            onClick={abrir}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil aria-hidden className="h-4 w-4" />
            Cambiar
          </button>
        )}
      </div>

      {editando && form && (
        <form onSubmit={guardar} className="mt-4 space-y-4">
          <BillingFields
            value={form}
            onChange={(b, nuevoTipo) => {
              setForm(b);
              setTipo(nuevoTipo);
            }}
            nombreAlumno={data.fullName}
            inputClass={inputClass}
            labelClass={labelClass}
          />
          <p className="text-xs text-gray-400">
            El cambio aplica a los recibos siguientes; los ya emitidos no se modifican.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setMsg(null);
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
