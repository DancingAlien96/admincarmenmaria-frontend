"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { DuplicateGroup, DuplicateStudent } from "@/lib/types";

export default function DuplicatesPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "STUDENTS", "EDITOR");

  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [keepBy, setKeepBy] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ groups: DuplicateGroup[] }>(
        "/api/students/duplicates"
      );
      setGroups(res.groups);
      // Por defecto conserva el que tenga DPI (o el primero del grupo)
      const defaults: Record<string, string> = {};
      for (const g of res.groups) {
        const withDpi = g.students.find((s) => s.dpi);
        defaults[g.key] = (withDpi ?? g.students[0]).id;
      }
      setKeepBy(defaults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mergeGroup(g: DuplicateGroup) {
    const keepId = keepBy[g.key];
    const dups = g.students.filter((s) => s.id !== keepId);
    const keep = g.students.find((s) => s.id === keepId)!;
    if (
      !confirm(
        `Se fusionarán ${dups.length} expediente(s) en "${keep.fullName}". ` +
          `Sus pagos, documentos y cargos se moverán al expediente conservado y ` +
          `los duplicados se eliminarán. ¿Continuar?`
      )
    )
      return;

    setMerging(g.key);
    setError(null);
    try {
      for (const d of dups) {
        await api("/api/students/merge", {
          method: "POST",
          body: { keepId, dupId: d.id },
        });
      }
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Error al fusionar expedientes"
      );
    } finally {
      setMerging(null);
    }
  }

  return (
    <div>
      <Link
        href="/panel/estudiantes"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver a expedientes
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-brand-800">
        Posibles duplicados
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Expedientes con el mismo nombre. Elige cuál conservar y fusiona; el resto
        se absorbe en él.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-400">Buscando duplicados…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="font-medium text-green-800">
            No se encontraron expedientes duplicados.
          </p>
          <p className="mt-1 text-sm text-green-700">
            Todo en orden por ahora.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section
              key={g.key}
              className="rounded-xl border border-amber-200 bg-white p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-brand-800">
                  {g.students[0].fullName}
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {g.students.length} expedientes
                  </span>
                </h2>
                {canEdit && (
                  <button
                    onClick={() => void mergeGroup(g)}
                    disabled={merging === g.key}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {merging === g.key ? "Fusionando…" : "Fusionar"}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-2 pr-2">Conservar</th>
                      <th className="py-2 pr-3">DPI</th>
                      <th className="py-2 pr-3">Correo</th>
                      <th className="py-2 pr-3">Sede</th>
                      <th className="py-2 pr-3">Inscrito</th>
                      <th className="py-2 pr-3">Datos</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.students.map((s) => (
                      <Row
                        key={s.id}
                        s={s}
                        checked={keepBy[g.key] === s.id}
                        onPick={() =>
                          setKeepBy((prev) => ({ ...prev, [g.key]: s.id }))
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  s,
  checked,
  onPick,
}: {
  s: DuplicateStudent;
  checked: boolean;
  onPick: () => void;
}) {
  return (
    <tr className={checked ? "bg-brand-50/50" : ""}>
      <td className="py-2 pr-2">
        <input
          type="radio"
          checked={checked}
          onChange={onPick}
          className="h-4 w-4 accent-brand-600"
        />
      </td>
      <td className="py-2 pr-3">
        {s.dpi ?? <span className="text-gray-400">(sin DPI)</span>}
      </td>
      <td className="py-2 pr-3 text-gray-600">{s.email ?? "—"}</td>
      <td className="py-2 pr-3 text-gray-600">{s.sede ?? "—"}</td>
      <td className="py-2 pr-3 text-gray-600">
        {s.enrollmentDate.slice(0, 10)}
      </td>
      <td className="py-2 pr-3 text-xs text-gray-500">
        {s._count.payments} pagos · {s._count.documents} docs ·{" "}
        {s._count.charges} cargos
      </td>
      <td className="py-2">
        <Link
          href={`/panel/estudiantes/detalle?id=${s.id}`}
          className="text-xs text-brand-600 hover:underline"
        >
          Ver
        </Link>
      </td>
    </tr>
  );
}
