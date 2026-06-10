"use client";

import { useState } from "react";
import { TEACHER_ROLE_LABELS } from "@/lib/labels";
import type { TeacherRole } from "@/lib/types";

const ALL_ROLES: TeacherRole[] = [
  "PRACTICA_HOSPITALARIA",
  "PRACTICA_COMUNITARIA",
  "TEORIA",
];

export interface TeacherFormValues {
  fullName: string;
  dpi: string;
  phone: string;
  email: string;
  title: string;
  collegiate: string;
  specialty: string;
  notes: string;
  roles: TeacherRole[];
}

export const emptyTeacherForm: TeacherFormValues = {
  fullName: "",
  dpi: "",
  phone: "",
  email: "",
  title: "",
  collegiate: "",
  specialty: "",
  notes: "",
  roles: [],
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export function TeacherForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: TeacherFormValues;
  submitLabel: string;
  onSubmit: (values: TeacherFormValues) => Promise<void>;
}) {
  const [v, setV] = useState<TeacherFormValues>(initial ?? emptyTeacherForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TeacherFormValues>(k: K, val: TeacherFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  function toggleRole(r: TeacherRole) {
    set(
      "roles",
      v.roles.includes(r) ? v.roles.filter((x) => x !== r) : [...v.roles, r]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre completo *</label>
            <input required className={inputClass} value={v.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>DPI</label>
            <input className={inputClass} value={v.dpi} onChange={(e) => set("dpi", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input className={inputClass} value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Correo electrónico</label>
            <input type="email" className={inputClass} value={v.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Datos profesionales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Título / profesión</label>
            <input className={inputClass} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Médico y Cirujano" />
          </div>
          <div>
            <label className={labelClass}>No. de colegiado</label>
            <input className={inputClass} value={v.collegiate} onChange={(e) => set("collegiate", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Especialidad</label>
            <input className={inputClass} value={v.specialty} onChange={(e) => set("specialty", e.target.value)} />
          </div>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-medium text-gray-700">Roles (puede tener varios)</h3>
        <div className="flex flex-wrap gap-3">
          {ALL_ROLES.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                v.roles.includes(r)
                  ? "border-brand-400 bg-brand-50 text-brand-800"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              <input
                type="checkbox"
                checked={v.roles.includes(r)}
                onChange={() => toggleRole(r)}
              />
              {TEACHER_ROLE_LABELS[r]}
            </label>
          ))}
        </div>

        <div className="mt-5">
          <label className={labelClass}>Notas / observaciones</label>
          <textarea rows={3} className={inputClass} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
