"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, EXPENSE_CATEGORY_LABELS, formatGTQ } from "@/lib/labels";
import type { Expense, ExpenseCategory } from "@/lib/types";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface Props {
  from: string;
  to: string;
  onChanged: () => Promise<void>;
}

export function ExpensesPanel({ from, to, onChanged }: Props) {
  const { user } = useAuth();
  const canEdit = canAccess(user, "DASHBOARD", "EDITOR");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, pageSize: "100" });
      const res = await api<{ data: Expense[]; total: number }>(
        `/api/expenses?${params}`
      );
      setExpenses(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshAll() {
    await load();
    await onChanged(); // refresca también los KPIs del dashboard
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este egreso?")) return;
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    await refreshAll();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-brand-800">
            Egresos del periodo
          </h2>
          <p className="text-sm text-gray-500">Total: {formatGTQ(total)}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? "Cerrar" : "+ Registrar egreso"}
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <ExpenseForm
          onCreated={async () => {
            setShowForm(false);
            await refreshAll();
          }}
        />
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Concepto</th>
              <th className="px-3 py-2 text-right">Monto</th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  Sin egresos en el periodo.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-gray-600">
                    {e.spentAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {EXPENSE_CATEGORY_LABELS[e.category]}
                  </td>
                  <td className="px-3 py-2 text-gray-800">{e.concept}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {formatGTQ(e.amount)}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => void remove(e.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExpenseForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [category, setCategory] = useState<ExpenseCategory>("SERVICIOS");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [spentAt, setSpentAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/api/expenses", {
        method: "POST",
        body: { category, concept, amount: Number(amount), spentAt },
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-gray-100 bg-gray-50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className={inputClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          placeholder="Concepto"
          required
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className={`${inputClass} sm:col-span-2`}
        />
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
        <input
          type="date"
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
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
        className="mt-3 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Registrar egreso"}
      </button>
    </form>
  );
}
