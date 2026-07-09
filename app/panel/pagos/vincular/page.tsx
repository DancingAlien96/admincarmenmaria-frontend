"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatGTQ } from "@/lib/labels";
import type { LinkSuggestionGroup } from "@/lib/types";

export default function VincularPagosPage() {
  const [groups, setGroups] = useState<LinkSuggestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ groups: LinkSuggestionGroup[] }>(
        "/api/payments/link-suggestions"
      );
      setGroups(r.groups);
      const def: Record<string, string> = {};
      for (const g of r.groups) if (g.best) def[g.key] = g.best.studentId;
      setChosen(def);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function link(g: LinkSuggestionGroup) {
    const studentId = chosen[g.key];
    if (!studentId) return;
    setBusy(g.key);
    setError(null);
    try {
      await api<{ linked: number }>("/api/payments/link-many", {
        method: "POST",
        body: { studentId, paymentIds: g.paymentIds },
      });
      setGroups((prev) => prev.filter((x) => x.key !== g.key));
      setDone((d) => d + g.count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al vincular");
    } finally {
      setBusy(null);
    }
  }

  function dismiss(key: string) {
    setGroups((prev) => prev.filter((x) => x.key !== key));
  }

  const pct = (s: number) => Math.round(s * 100);
  const conf = (s: number) =>
    s >= 0.85
      ? "bg-green-100 text-green-700"
      : s >= 0.6
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return (
    <div>
      <Link href="/panel/pagos" className="text-sm text-brand-600 hover:underline">
        ← Volver a pagos
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-brand-800">
        Vincular pagos a expedientes
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Pagos sin vincular agrupados por pagador, con el estudiante más parecido.
        Revisa el % de coincidencia y confirma. {done > 0 && `Vinculados: ${done}.`}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-400">Buscando coincidencias…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="font-medium text-green-800">
            No quedan pagos con coincidencias por revisar.
          </p>
          <p className="mt-1 text-sm text-green-700">
            Los pagos sin coincidencia se vinculan a mano desde cada pago.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const options = [g.best!, ...g.alternatives];
            return (
              <div
                key={g.key}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Pagador */}
                  <div className="min-w-[180px]">
                    <p className="font-medium text-gray-800">{g.payerName}</p>
                    <p className="text-xs text-gray-500">
                      {g.count} pago(s) · {formatGTQ(g.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {g.concepts.join(", ")}
                    </p>
                    {g.payerEmail && (
                      <p className="text-xs text-gray-400">{g.payerEmail}</p>
                    )}
                  </div>

                  {/* Sugerencia + selección */}
                  <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                    <span className="text-sm text-gray-400">→</span>
                    <select
                      value={chosen[g.key] ?? ""}
                      onChange={(e) =>
                        setChosen((p) => ({ ...p, [g.key]: e.target.value }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {options.map((o) => (
                        <option key={o.studentId} value={o.studentId}>
                          {o.fullName}
                          {o.sede ? ` · ${o.sede}` : ""} ({pct(o.score)}%)
                        </option>
                      ))}
                    </select>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${conf(
                        options.find((o) => o.studentId === chosen[g.key])
                          ?.score ?? g.best!.score
                      )}`}
                    >
                      {pct(
                        options.find((o) => o.studentId === chosen[g.key])
                          ?.score ?? g.best!.score
                      )}
                      %
                    </span>
                    <button
                      onClick={() => void link(g)}
                      disabled={busy === g.key}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {busy === g.key ? "Vinculando…" : "Vincular"}
                    </button>
                    <button
                      onClick={() => dismiss(g.key)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
