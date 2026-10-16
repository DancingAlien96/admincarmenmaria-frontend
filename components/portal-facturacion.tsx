"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
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
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

// Portal · Facturación: formulario con los datos de los recibos electrónicos.
export function PortalFacturacion() {
  const [form, setForm] = useState<BillingValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ facturacion: Facturacion }>("/api/portal/facturacion")
      .then((r) => setForm(billingFrom(r.facturacion)))
      .catch(() => setMsg({ ok: false, text: "No se pudieron cargar tus datos de facturación." }));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const err = billingError(form);
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
      setForm(billingFrom(r.facturacion));
      setMsg({ ok: true, text: "Datos guardados." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo guardar" });
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return msg ? (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg.text}</p>
    ) : (
      <p className="text-sm text-gray-400">Cargando…</p>
    );
  }

  return (
    <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <BillingFields
        value={form}
        onChange={(b) => {
          setForm(b);
          setMsg(null);
        }}
        inputClass={inputClass}
        labelClass={labelClass}
      />
      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
