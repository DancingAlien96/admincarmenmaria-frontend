"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ActaEntry, StudentListItem } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export interface ActaFormValues {
  actaNumber: string;
  folios: string;
  phase: string;
  actaDate: string;
  entries: ActaEntry[];
}

export const emptyActaForm: ActaFormValues = {
  actaNumber: "",
  folios: "",
  phase: "Evaluación Final Fase I",
  actaDate: new Date().toISOString().slice(0, 10),
  entries: [],
};

interface Props {
  initial?: ActaFormValues;
  submitLabel: string;
  onSubmit: (values: ActaFormValues) => Promise<void>;
}

export function ActaForm({ initial, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<ActaFormValues>(
    initial ?? emptyActaForm
  );
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ data: StudentListItem[] }>(
      "/api/students?status=ACTIVO&pageSize=100"
    ).then((r) => setStudents(r.data));
  }, []);

  function set<K extends keyof ActaFormValues>(key: K, v: ActaFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function addStudent(s: StudentListItem) {
    if (values.entries.some((e) => e.studentId === s.id)) return;
    set("entries", [
      ...values.entries,
      { studentId: s.id, studentName: s.fullName, score: 0 },
    ]);
  }

  function addAll() {
    const toAdd = students
      .filter((s) => !values.entries.some((e) => e.studentId === s.id))
      .map((s) => ({ studentId: s.id, studentName: s.fullName, score: 0 }));
    set("entries", [...values.entries, ...toAdd]);
  }

  function addManual() {
    set("entries", [
      ...values.entries,
      { studentId: null, studentName: "", score: 0 },
    ]);
  }

  function updateEntry(i: number, patch: Partial<ActaEntry>) {
    set(
      "entries",
      values.entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e))
    );
  }

  function removeEntry(i: number) {
    set(
      "entries",
      values.entries.filter((_, idx) => idx !== i)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (values.entries.length === 0) {
      setError("Agrega al menos un estudiante.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const avg =
    values.entries.length > 0
      ? (
          values.entries.reduce((s, e) => s + Number(e.score || 0), 0) /
          values.entries.length
        ).toFixed(2)
      : "—";

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Datos del acta</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>No. de acta *</label>
            <input
              required
              value={values.actaNumber}
              onChange={(e) => set("actaNumber", e.target.value)}
              className={inputClass}
              placeholder="012-2026"
            />
          </div>
          <div>
            <label className={labelClass}>No. de folios</label>
            <input
              value={values.folios}
              onChange={(e) => set("folios", e.target.value)}
              className={inputClass}
              placeholder="45-47"
            />
          </div>
          <div>
            <label className={labelClass}>Fase del programa *</label>
            <input
              required
              value={values.phase}
              onChange={(e) => set("phase", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha del acta *</label>
            <input
              type="date"
              required
              value={values.actaDate}
              onChange={(e) => set("actaDate", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-brand-800">Estudiantes y punteos</h2>
          <div className="flex flex-wrap gap-2">
            <select
              onChange={(e) => {
                const s = students.find((st) => st.id === e.target.value);
                if (s) addStudent(s);
                e.target.value = "";
              }}
              defaultValue=""
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="" disabled>
                Agregar estudiante…
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addAll}
              className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              Agregar todos los activos
            </button>
            <button
              type="button"
              onClick={addManual}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              + Manual
            </button>
          </div>
        </div>

        {values.entries.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin estudiantes. Agrégalos desde el selector o manualmente.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 w-10">#</th>
                <th className="py-2">Estudiante</th>
                <th className="py-2 w-28">Punteo</th>
                <th className="py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {values.entries.map((e, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-500">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <input
                      required
                      value={e.studentName}
                      onChange={(ev) =>
                        updateEntry(i, { studentName: ev.target.value })
                      }
                      className={inputClass}
                      placeholder="Nombre del estudiante"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      value={e.score}
                      onChange={(ev) =>
                        updateEntry(i, { score: Number(ev.target.value) })
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td></td>
                <td className="py-2 text-right font-medium text-brand-800">
                  Promedio del grupo
                </td>
                <td className="py-2 font-bold text-brand-800">{avg}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
