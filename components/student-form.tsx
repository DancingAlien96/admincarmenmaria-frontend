"use client";

import { useState } from "react";
import type { Guardian } from "@/lib/types";

export interface StudentFormValues {
  fullName: string;
  dpi: string;
  birthDate: string;
  department: string;
  municipality: string;
  address: string;
  phonePrimary: string;
  phoneAlt: string;
  email: string;
  guardians: Guardian[];
}

export const emptyStudentForm: StudentFormValues = {
  fullName: "",
  dpi: "",
  birthDate: "",
  department: "",
  municipality: "",
  address: "",
  phonePrimary: "",
  phoneAlt: "",
  email: "",
  guardians: [],
};

interface Props {
  initial?: StudentFormValues;
  submitLabel: string;
  onSubmit: (values: StudentFormValues) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export function StudentForm({ initial, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<StudentFormValues>(
    initial ?? emptyStudentForm
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof StudentFormValues>(
    key: K,
    value: StudentFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function addGuardian() {
    set("guardians", [
      ...values.guardians,
      { name: "", relationship: "", phone: "", email: "" },
    ]);
  }

  function updateGuardian(i: number, key: keyof Guardian, value: string) {
    const next = values.guardians.map((g, idx) =>
      idx === i ? { ...g, [key]: value } : g
    );
    set("guardians", next);
  }

  function removeGuardian(i: number) {
    set(
      "guardians",
      values.guardians.filter((_, idx) => idx !== i)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre completo *</label>
            <input
              required
              className={inputClass}
              value={values.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>DPI / Identificación</label>
            <input
              className={inputClass}
              value={values.dpi}
              onChange={(e) => set("dpi", e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input
              type="date"
              className={inputClass}
              value={values.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Departamento</label>
            <input
              className={inputClass}
              value={values.department}
              onChange={(e) => set("department", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Municipio</label>
            <input
              className={inputClass}
              value={values.municipality}
              onChange={(e) => set("municipality", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección exacta</label>
            <input
              className={inputClass}
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono principal</label>
            <input
              className={inputClass}
              value={values.phonePrimary}
              onChange={(e) => set("phonePrimary", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono alternativo</label>
            <input
              className={inputClass}
              value={values.phoneAlt}
              onChange={(e) => set("phoneAlt", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              className={inputClass}
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-brand-800">
            Personas responsables
          </h2>
          <button
            type="button"
            onClick={addGuardian}
            className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            + Agregar
          </button>
        </div>

        {values.guardians.length === 0 && (
          <p className="text-sm text-gray-400">
            Sin responsables registrados.
          </p>
        )}

        <div className="space-y-4">
          {values.guardians.map((g, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2"
            >
              <input
                placeholder="Nombre *"
                required
                className={inputClass}
                value={g.name}
                onChange={(e) => updateGuardian(i, "name", e.target.value)}
              />
              <input
                placeholder="Parentesco (madre, padre…)"
                className={inputClass}
                value={g.relationship ?? ""}
                onChange={(e) =>
                  updateGuardian(i, "relationship", e.target.value)
                }
              />
              <input
                placeholder="Teléfono"
                className={inputClass}
                value={g.phone ?? ""}
                onChange={(e) => updateGuardian(i, "phone", e.target.value)}
              />
              <input
                placeholder="Correo"
                className={inputClass}
                value={g.email ?? ""}
                onChange={(e) => updateGuardian(i, "email", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeGuardian(i)}
                className="justify-self-start text-sm text-red-600 hover:underline"
              >
                Quitar responsable
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
