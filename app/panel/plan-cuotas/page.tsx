"use client";

import { ArrowRight } from "lucide-react";
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
  // Diálogo para llevar un cambio del plan a las cuotas ya asignadas
  const [propagar, setPropagar] = useState<{
    id: string;
    oldAmount: number | null;
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

  // Total del plan del alumno admitido (sin el cobro de admisión)
  const total = (items ?? [])
    .filter((i) => i.active && !i.admission)
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
    const prev = items?.find((i) => i.id === id);
    try {
      await api(`/api/charges/plan-template/${id}`, {
        method: "PATCH",
        body: { concept, amount: Number(amount) },
      });
      setEdit(null);
      await load();
      // Si cambió algo, preguntar si se aplica a las cuotas ya asignadas
      if (
        prev &&
        (prev.amount !== Number(amount) || prev.concept !== concept.trim())
      ) {
        setPropagar({
          id,
          oldAmount: prev.amount !== Number(amount) ? prev.amount : null,
        });
      }
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
        La <b>admisión</b> se cobra al aspirante en cuanto llena su ficha. El
        resto (mensualidades y trámite) es el plan del alumno admitido: se le
        aplica al aprobar el examen, desde su expediente o a toda una cohorte
        aquí abajo. Al
        cambiar un monto podrás elegir si también se actualizan las cuotas
        pendientes ya asignadas (las pagadas nunca cambian).
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
            {[
              {
                title: "Admisión · se cobra al aspirante",
                rows: items.filter((i) => i.admission),
              },
              {
                title: "Plan del alumno admitido",
                rows: items.filter((i) => !i.admission),
              },
            ].map((g) => (
            <tbody key={g.title} className="divide-y divide-gray-100">
              <tr className="bg-brand-50/50">
                <td
                  colSpan={4}
                  className="px-4 py-2 text-xs font-semibold uppercase text-brand-800"
                >
                  {g.title}
                </td>
              </tr>
              {g.rows.map((it) => (
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
                          onClick={() =>
                            setPropagar({ id: it.id, oldAmount: null })
                          }
                          title="Aplicar el monto actual a las cuotas ya asignadas a estudiantes"
                          className="mr-2 text-xs text-gray-600 hover:underline"
                        >
                          Asignadas
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
            ))}
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-700" colSpan={2}>
                  Total del plan del alumno
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

      {propagar && (
        <PropagateDialog
          itemId={propagar.id}
          oldAmount={propagar.oldAmount}
          onClose={() => setPropagar(null)}
        />
      )}
    </div>
  );
}

interface ImpactRow {
  year: number | null;
  pending: number;
  overdue: number;
  partial: number;
  paid: number;
}
interface Impact {
  item: CuotaPlanItem;
  cohorts: ImpactRow[];
  totals: Omit<ImpactRow, "year">;
}

// Pregunta si un cambio del plan se lleva a las cuotas ya asignadas.
// Las cuotas pagadas o anuladas nunca se modifican.
function PropagateDialog({
  itemId,
  oldAmount,
  onClose,
}: {
  itemId: string;
  oldAmount: number | null;
  onClose: () => void;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<string>("all");
  const [includeOverdue, setIncludeOverdue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    api<Impact>(`/api/charges/plan-template/${itemId}/impact`)
      .then(setImpact)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "No se pudo calcular el impacto"
        )
      );
  }, [itemId]);

  const affected = (impact?.cohorts ?? [])
    .filter((r) => year === "all" || String(r.year) === year)
    .reduce((s, r) => s + r.pending + (includeOverdue ? r.overdue : 0), 0);
  const unpaidTotal = impact
    ? impact.totals.pending + impact.totals.overdue
    : 0;

  async function aplicar() {
    setBusy(true);
    try {
      const r = await api<{ updated: number; nowPaid: number }>(
        `/api/charges/plan-template/${itemId}/propagate`,
        {
          method: "POST",
          body: {
            year: year === "all" ? null : Number(year),
            onlyFuture: !includeOverdue,
          },
        }
      );
      setDone(
        `Se actualizaron ${r.updated} cuota(s).` +
          (r.nowPaid > 0
            ? ` ${r.nowPaid} quedaron cubiertas por sus abonos y pasaron a pagadas.`
            : "")
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aplicar");
    } finally {
      setBusy(false);
    }
  }

  const primaryBtn =
    "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-lg font-bold text-brand-800">
          ¿Aplicar a cuotas ya asignadas?
        </h3>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!impact && !error && (
          <p className="text-sm text-gray-400">Calculando…</p>
        )}

        {!impact && error && (
          <div className="flex justify-end">
            <button onClick={onClose} className="text-sm text-gray-600">
              Cerrar
            </button>
          </div>
        )}

        {impact && (
          <div className="mb-4 rounded-lg bg-brand-50/60 px-4 py-3 text-sm">
            <p className="font-medium text-gray-800">{impact.item.concept}</p>
            <p className="text-gray-600">
              {oldAmount !== null ? (
                <>
                  <span className="line-through">{formatGTQ(oldAmount)}</span>
                  <ArrowRight aria-hidden className="mx-1 inline h-3.5 w-3.5 align-[-2px]" />
                </>
              ) : (
                "Monto actual: "
              )}
              <span className="font-semibold text-brand-800">
                {formatGTQ(impact.item.amount)}
              </span>
            </p>
          </div>
        )}

        {impact && done && (
          <>
            <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              {done}
            </p>
            <div className="flex justify-end">
              <button onClick={onClose} className={primaryBtn}>
                Listo
              </button>
            </div>
          </>
        )}

        {impact && !done && unpaidTotal === 0 && (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Ningún estudiante tiene esta cuota pendiente de pago. El cambio
              se usará en las próximas asignaciones.
              {impact.totals.paid > 0 &&
                ` (${impact.totals.paid} ya pagada(s), no se modifican.)`}
            </p>
            <div className="flex justify-end">
              <button onClick={onClose} className={primaryBtn}>
                Entendido
              </button>
            </div>
          </>
        )}

        {impact && !done && unpaidTotal > 0 && (
          <>
            <p className="mb-3 text-sm text-gray-600">
              Esta cuota ya está asignada a estudiantes. Las cuotas{" "}
              <b>pagadas</b> nunca se modifican.
            </p>

            <table className="mb-4 w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-1">Promoción</th>
                  <th className="py-1 text-right">Por vencer</th>
                  <th className="py-1 text-right">Vencidas</th>
                  <th className="py-1 text-right">Pagadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {impact.cohorts.map((r) => (
                  <tr
                    key={String(r.year)}
                    className={
                      year === "all" || String(r.year) === year
                        ? "text-gray-700"
                        : "text-gray-300"
                    }
                  >
                    <td className="py-1.5">{r.year ?? "Sin año"}</td>
                    <td className="py-1.5 text-right">{r.pending}</td>
                    <td className="py-1.5 text-right">{r.overdue}</td>
                    <td className="py-1.5 text-right">{r.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-4 space-y-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-gray-600">Aplicar a</span>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="all">Todas las promociones</option>
                  {impact.cohorts
                    .filter((r) => r.year !== null)
                    .map((r) => (
                      <option key={r.year} value={String(r.year)}>
                        Promoción {r.year}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={includeOverdue}
                  onChange={(e) => setIncludeOverdue(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-gray-700">
                  Incluir cuotas ya vencidas
                  <span className="block text-xs text-gray-500">
                    Por defecto solo se ajustan las que aún no vencen.
                  </span>
                </span>
              </label>
              {impact.totals.partial > 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {impact.totals.partial} cuota(s) tienen abonos parciales: se
                  conserva lo abonado y se ajusta el saldo.
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Solo nuevas asignaciones
              </button>
              <button
                onClick={() => void aplicar()}
                disabled={busy || affected === 0}
                className={primaryBtn}
              >
                {busy ? "Actualizando…" : `Actualizar ${affected} cuota(s)`}
              </button>
            </div>
          </>
        )}
      </div>
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
