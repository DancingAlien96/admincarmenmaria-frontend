"use client";

import { useEffect, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api";
import type {
  ActaRow,
  ActaSigner,
  ActaTemplate,
  StudentListItem,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export interface ActaFormValues {
  actaNumber: string;
  folios: string;
  title: string;
  actaDate: string; // datetime-local
  closeDate: string; // date
  city: string;
  department: string;
  body: string;
  notes: string;
  vars: { key: string; value: string }[];
  columns: string[]; // [noLabel, nameLabel, valueLabel?]
  rows: ActaRow[];
  signers: ActaSigner[];
  templateId: string;
  hasTable: boolean; // muestra columna de valor
}

export const emptyActaForm: ActaFormValues = {
  actaNumber: "",
  folios: "",
  title: "",
  actaDate: new Date().toISOString().slice(0, 16),
  closeDate: "",
  city: "Chiquimula",
  department: "Chiquimula",
  body: "",
  notes: "",
  vars: [],
  columns: ["NO.", "NOMBRE DEL ALUMNO", "Nota Obtenida"],
  rows: [],
  signers: [{ name: "", role: "" }],
  templateId: "",
  hasTable: true,
};

const MARKERS = [
  ["{{numero}}", "No. de acta"],
  ["{{folios}}", "Folios"],
  ["{{ciudad}}", "Ciudad"],
  ["{{departamento}}", "Departamento"],
  ["{{fecha_letras}}", "Fecha del acta en letras"],
  ["{{hora_letras}}", "Hora del acta en letras"],
  ["{{fecha_cierre_letras}}", "Fecha de cierre en letras"],
  ["{{FECHA_CIERRE_LETRAS}}", "…en MAYÚSCULAS"],
  ["{{total_letras}}", "Total de alumnos en letras"],
  ["{{tabla}}", "Cuadro de notas"],
  ["{{lista}}", "Lista de alumnos"],
];

interface Props {
  initial?: ActaFormValues;
  submitLabel: string;
  onSubmit: (values: ActaFormValues) => Promise<void>;
}

export function ActaForm({ initial, submitLabel, onSubmit }: Props) {
  const [v, setV] = useState<ActaFormValues>(initial ?? emptyActaForm);
  const [templates, setTemplates] = useState<ActaTemplate[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ templates: ActaTemplate[] }>("/api/actas/templates").then((r) =>
      setTemplates(r.templates)
    );
    void api<{ data: StudentListItem[] }>(
      "/api/students?status=ACTIVO&pageSize=100"
    ).then((r) => setStudents(r.data));
  }, []);

  function set<K extends keyof ActaFormValues>(k: K, val: ActaFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) {
      set("templateId", "");
      return;
    }
    setV((p) => ({
      ...p,
      templateId: id,
      title: t.title ?? p.title,
      body: t.body,
      columns:
        t.columns && t.columns.length ? t.columns : p.columns,
      signers: t.signers && t.signers.length ? t.signers : p.signers,
      vars: Object.entries(t.vars ?? {}).map(([key, value]) => ({ key, value })),
      hasTable: t.block !== "lista",
    }));
  }

  function addRowsFromStudents() {
    const existing = new Set(v.rows.map((r) => r.name));
    const add = students
      .filter((s) => !existing.has(s.fullName))
      .map((s) => ({ name: s.fullName, value: "" }));
    set("rows", [...v.rows, ...add]);
  }

  function buildPayload() {
    return {
      actaNumber: v.actaNumber,
      folios: v.folios,
      title: v.title,
      actaDate: v.actaDate,
      closeDate: v.closeDate,
      city: v.city,
      department: v.department,
      body: v.body,
      notes: v.notes,
      vars: Object.fromEntries(
        v.vars.filter((x) => x.key.trim()).map((x) => [x.key.trim(), x.value])
      ),
      columns: v.hasTable ? v.columns : v.columns.slice(0, 2),
      rows: v.rows.map((r) => ({ name: r.name, value: r.value ?? "" })),
      signers: v.signers.filter((s) => s.name.trim()),
    };
  }

  async function preview() {
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/actas/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error("No se pudo generar la vista previa");
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en vista previa");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.body.trim()) {
      setError("El cuerpo del acta no puede estar vacío.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const usesTable = v.body.includes("{{tabla}}");
  const usesList = v.body.includes("{{lista}}");

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Datos */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Datos del acta</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>No. de acta *</label>
            <input required value={v.actaNumber} onChange={(e) => set("actaNumber", e.target.value)} className={inputClass} placeholder="01-2026" />
          </div>
          <div>
            <label className={labelClass}>Folios</label>
            <input value={v.folios} onChange={(e) => set("folios", e.target.value)} className={inputClass} placeholder="90,91,92" />
          </div>
          <div>
            <label className={labelClass}>Título / tipo de acta</label>
            <input value={v.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="Acta de Calificaciones" />
          </div>
          <div>
            <label className={labelClass}>Plantilla</label>
            <select value={v.templateId} onChange={(e) => applyTemplate(e.target.value)} className={inputClass}>
              <option value="">— Sin plantilla / personalizada —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha y hora del acto *</label>
            <input type="datetime-local" required value={v.actaDate} onChange={(e) => set("actaDate", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fecha de cierre / remisión</label>
            <input type="date" value={v.closeDate} onChange={(e) => set("closeDate", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input value={v.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Departamento</label>
            <input value={v.department} onChange={(e) => set("department", e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      {/* Cuerpo */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-brand-800">Cuerpo del acta</h2>
        <p className="mb-3 text-xs text-gray-500">
          Escribe el texto libremente. Usa marcadores y el sistema los rellena.
          Para insertar el cuadro de alumnos escribe <code>{"{{tabla}}"}</code> (con notas) o{" "}
          <code>{"{{lista}}"}</code> (solo nombres) donde quieras.
        </p>
        <div className="mb-2 flex flex-wrap gap-1">
          {MARKERS.map(([m, desc]) => (
            <button key={m} type="button" title={desc}
              onClick={() => set("body", v.body + m)}
              className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-brand-700 hover:bg-brand-50">
              {m}
            </button>
          ))}
        </div>
        <textarea value={v.body} onChange={(e) => set("body", e.target.value)} rows={14} className={`${inputClass} font-mono text-xs leading-relaxed`} placeholder="El infrascrito Secretario… CERTIFICA…" />
      </section>

      {/* Variables */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-800">Variables personalizadas</h2>
          <button type="button" onClick={() => set("vars", [...v.vars, { key: "", value: "" }])} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100">+ Agregar</button>
        </div>
        <p className="mb-3 text-xs text-gray-500">Cada variable se usa en el cuerpo como <code>{"{{clave}}"}</code>. Ej: clave <b>directora</b> → escribe <code>{"{{directora}}"}</code>.</p>
        {v.vars.length === 0 ? (
          <p className="text-sm text-gray-400">Sin variables.</p>
        ) : (
          <div className="space-y-2">
            {v.vars.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input value={row.key} onChange={(e) => set("vars", v.vars.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} className={`${inputClass} w-40`} placeholder="clave" />
                <input value={row.value} onChange={(e) => set("vars", v.vars.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className={inputClass} placeholder="valor" />
                <button type="button" onClick={() => set("vars", v.vars.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-600 hover:underline">Quitar</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alumnos / notas */}
      {(usesTable || usesList) && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-brand-800">Alumnos {usesTable ? "y notas" : ""}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={addRowsFromStudents} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100">Agregar activos</button>
              <button type="button" onClick={() => set("rows", [...v.rows, { name: "", value: "" }])} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">+ Manual</button>
            </div>
          </div>
          {usesTable && (
            <div className="mb-3">
              <label className={labelClass}>Encabezado de la columna de nota</label>
              <input value={v.columns[2] ?? "Nota Obtenida"} onChange={(e) => set("columns", [v.columns[0] ?? "NO.", v.columns[1] ?? "NOMBRE DEL ALUMNO", e.target.value])} className={`${inputClass} max-w-xs`} />
            </div>
          )}
          {v.rows.length === 0 ? (
            <p className="text-sm text-gray-400">Sin alumnos. Agrégalos arriba.</p>
          ) : (
            <div className="space-y-1.5">
              {v.rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-gray-400">{i + 1}</span>
                  <input value={r.name} onChange={(e) => set("rows", v.rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputClass} placeholder="Nombre del alumno" />
                  {usesTable && (
                    <input value={r.value ?? ""} onChange={(e) => set("rows", v.rows.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className={`${inputClass} w-32`} placeholder="Nota" />
                  )}
                  <button type="button" onClick={() => set("rows", v.rows.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-600 hover:underline">Quitar</button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">{v.rows.length} alumno(s)</p>
        </section>
      )}

      {/* Firmantes */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-800">Firmantes</h2>
          <button type="button" onClick={() => set("signers", [...v.signers, { name: "", role: "" }])} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100">+ Agregar</button>
        </div>
        <p className="mb-3 text-xs text-gray-500">El primero lleva la firma; el sello va a la derecha. Los demás aparecen como “Vo.Bo.”.</p>
        <div className="space-y-2">
          {v.signers.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s.name} onChange={(e) => set("signers", v.signers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputClass} placeholder="Nombre" />
              <input value={s.role} onChange={(e) => set("signers", v.signers.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} className={`${inputClass} w-48`} placeholder="Cargo" />
              <button type="button" onClick={() => set("signers", v.signers.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-600 hover:underline">Quitar</button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={preview} className="rounded-lg border border-brand-300 px-5 py-2.5 font-medium text-brand-700 hover:bg-brand-50">Vista previa</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60">{saving ? "Guardando…" : submitLabel}</button>
      </div>
    </form>
  );
}
