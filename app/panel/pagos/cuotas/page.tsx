"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, FEE_CATEGORY_LABELS, formatGTQ } from "@/lib/labels";
import type { FeeCategory, FeeType } from "@/lib/types";

const CATEGORIES = Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function FeesPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "PAYMENTS", "EDITOR");

  const [fees, setFees] = useState<FeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fees } = await api<{ fees: FeeType[] }>("/api/fees?all=true");
      setFees(fees);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(fee: FeeType) {
    await api(`/api/fees/${fee.id}`, {
      method: "PATCH",
      body: { active: !fee.active },
    });
    await load();
  }

  return (
    <div>
      <Link href="/panel/pagos" className="text-sm text-brand-600 hover:underline">
        ← Volver a pagos
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Tipos de cuota
          </h1>
          <p className="text-sm text-gray-500">
            Montos configurables sin tocar código.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? "Cerrar" : "+ Nueva cuota"}
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <FeeForm
          onCreated={async () => {
            setShowForm(false);
            await load();
          }}
        />
      )}

      {/* Tabla (escritorio) */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Estado</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : fees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No hay cuotas configuradas.
                </td>
              </tr>
            ) : (
              fees.map((f) => (
                <tr key={f.id} className={f.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {FEE_CATEGORY_LABELS[f.category]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {formatGTQ(f.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        f.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {f.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void toggleActive(f)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        {f.active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Cargando…</p>
        ) : fees.length === 0 ? (
          <p className="py-8 text-center text-gray-400">
            No hay cuotas configuradas.
          </p>
        ) : (
          fees.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl border border-gray-200 bg-white p-4 ${
                f.active ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{f.name}</p>
                  <p className="text-xs text-gray-500">
                    {FEE_CATEGORY_LABELS[f.category]}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-gray-800">
                  {formatGTQ(f.amount)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    f.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {f.active ? "Activa" : "Inactiva"}
                </span>
                {canEdit && (
                  <button
                    onClick={() => void toggleActive(f)}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {f.active ? "Desactivar" : "Activar"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FeeForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeeCategory>("MENSUALIDAD");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/api/fees", {
        method: "POST",
        body: { name, category, amount: Number(amount) },
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <h2 className="mb-4 font-semibold text-brand-800">Nueva cuota</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          placeholder="Nombre (ej. Mensualidad Teoría)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeeCategory)}
          className={inputClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FEE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          placeholder="Monto (Q)"
          required
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Creando…" : "Crear cuota"}
      </button>
    </form>
  );
}
