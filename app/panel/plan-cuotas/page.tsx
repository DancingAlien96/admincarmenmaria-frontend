"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatGTQ } from "@/lib/labels";
import type { CuotaPlanItem } from "@/lib/types";

export default function PlanCuotasPage() {
  const [items, setItems] = useState<CuotaPlanItem[] | null>(null);
  // Alta de una cuota nueva
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [monthOffset, setMonthOffset] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{
    id: string;
    concept: string;
    amount: string;
  } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ items: CuotaPlanItem[] }>(
      "/api/charges/plan-template?all=true"
    );
    setItems(r.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = (items ?? [])
    .filter((i) => i.active)
    .reduce((s, i) => s + i.amount, 0);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim() || !amount) return;
    setBusy(true);
    try {
      await api("/api/charges/plan-template", {
        method: "POST",
        body: {
          concept: concept.trim(),
          amount: Number(amount),
          monthOffset: Number(monthOffset) || 0,
        },
      });
      setConcept("");
      setAmount("");
      setMonthOffset("");
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  async function guardar(id: string, concept: string, amount: string) {
    try {
      await api(`/api/charges/plan-template/${id}`, {
        method: "PATCH",
        body: { concept, amount: Number(amount) },
      });
      setEdit(null);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    }
  }

  async function toggle(it: CuotaPlanItem) {
    try {
      await api(`/api/charges/plan-template/${it.id}`, {
        method: "PATCH",
        body: { active: !it.active },
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo cambiar");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Plan de cuotas general
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Este es el plan de cuotas que se aplica a los estudiantes (Admisión,
        mensualidades y trámite). Defínelo una sola vez; luego lo aplicas a un
        estudiante desde su expediente o a toda una cohorte aquí abajo. Editar
        los montos NO cambia las cuotas ya generadas a estudiantes.
      </p>

      {/* Agregar cuota */}
      <form
        onSubmit={agregar}
        className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4"
      >
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Concepto</span>
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej. Cuota 13"
            className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Monto (Q)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Mes (desde inicio)</span>
          <input
            type="number"
            min={0}
            value={monthOffset}
            onChange={(e) => setMonthOffset(e.target.value)}
            placeholder="0"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Agregar
        </button>
      </form>

      {/* Lista del plan */}
      {!items ? (
        <p className="text-gray-400">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Mes</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className={it.active ? "" : "bg-gray-50"}>
                  {edit?.id === it.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={edit.concept}
                          onChange={(e) =>
                            setEdit({ ...edit, concept: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        +{it.monthOffset}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={edit.amount}
                          onChange={(e) =>
                            setEdit({ ...edit, amount: e.target.value })
                          }
                          className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() =>
                            void guardar(it.id, edit.concept, edit.amount)
                          }
                          className="mr-2 text-xs font-medium text-brand-600 hover:underline"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEdit(null)}
                          className="text-xs text-gray-500"
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td
                        className={`px-4 py-2 ${
                          it.active
                            ? "text-gray-800"
                            : "text-gray-400 line-through"
                        }`}
                      >
                        {it.concept}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        +{it.monthOffset}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {formatGTQ(it.amount)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() =>
                            setEdit({
                              id: it.id,
                              concept: it.concept,
                              amount: String(it.amount),
                            })
                          }
                          className="mr-2 text-xs text-brand-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void toggle(it)}
                          className={`text-xs hover:underline ${
                            it.active ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {it.active ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700" colSpan={2}>
                  Total del plan
                </td>
                <td className="px-4 py-3 text-right font-bold text-brand-800">
                  {formatGTQ(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <ApplyCohort />
    </div>
  );
}

function ApplyCohort() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear() + 1));
  const [startMonth, setStartMonth] = useState(`${now.getFullYear() + 1}-01`);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function aplicar() {
    if (
      !confirm(
        `Se aplicará el plan general a todos los estudiantes activos inscritos en ${year} que aún no tengan cuotas. ¿Continuar?`
      )
    )
      return;
    setBusy(true);
    setResult(null);
    try {
      const r = await api<{ total: number; applied: number; skipped: number }>(
        "/api/charges/apply-cohort",
        { method: "POST", body: { year: Number(year), startMonth } }
      );
      setResult(
        `Cohorte ${year}: ${r.applied} plan(es) aplicados, ${r.skipped} omitidos (ya tenían cuotas), de ${r.total} estudiantes.`
      );
    } catch (err) {
      setResult(
        err instanceof ApiError ? err.message : "No se pudo aplicar a la cohorte"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/40 p-5">
      <h2 className="mb-1 font-semibold text-brand-800">
        Aplicar a toda una cohorte
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Crea las cuotas del plan general para todos los estudiantes activos
        inscritos en un año. Los que ya tienen cuotas se omiten (no se
        duplican).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Año de inscripción</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Mes de inicio</span>
          <input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={() => void aplicar()}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Aplicando…" : "Aplicar a la cohorte"}
        </button>
      </div>
      {result && (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
          {result}
        </p>
      )}
    </div>
  );
}
