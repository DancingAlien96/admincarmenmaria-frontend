"use client";

import { useEffect, useState } from "react";
import { api, ApiError, apiUrl } from "@/lib/api";
import type {
  ActaSigner,
  ActaTemplate,
  Signatory,
  StudentListItem,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export interface ActaRowForm {
  name: string;
  values: string[];
}

export interface ActaFormValues {
  actaNumber: string;
  folios: string;
  title: string;
  actaDate: string;
  closeDate: string;
  city: string;
  department: string;
  body: string;
  notes: string;
  vars: { key: string; value: string }[];
  columns: string[]; // [No, Nombre, ...columnas de notas]
  rows: ActaRowForm[];
  signers: ActaSigner[];
  templateId: string;
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
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ templates: ActaTemplate[] }>("/api/actas/templates").then((r) =>
      setTemplates(r.templates)
    );
    void api<{ data: StudentListItem[] }>(
      "/api/students?status=ACTIVO&pageSize=100"
    ).then((r) => setStudents(r.data));
    void api<{ signatories: Signatory[] }>("/api/signatories")
      .then((r) => setSignatories(r.signatories))
      .catch(() => setSignatories([])); // solo admin puede listarlas
  }, []);

  function set<K extends keyof ActaFormValues>(k: K, val: ActaFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  const noteCols = v.columns.slice(2); // encabezados de columnas de notas
  const usesTable = v.body.includes("{{tabla}}");
  const usesList = v.body.includes("{{lista}}");

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) {
      set("templateId", "");
      return;
    }
    // Cruza los firmantes de la plantilla con el catálogo para traer su firma.
    const norm = (s: string) => s.trim().toLowerCase();
    const baseSigners: ActaSigner[] =
      t.signers && t.signers.length ? t.signers : v.signers;
    const signers = baseSigners.map((sg) => {
      const match = signatories.find((x) => norm(x.name) === norm(sg.name));
      return match ? { ...sg, signatureKey: match.signatureKey } : sg;
    });
    setV((p) => ({
      ...p,
      templateId: id,
      title: t.title ?? p.title,
      body: t.body,
      columns: t.columns && t.columns.length ? t.columns : p.columns,
      signers,
      vars: Object.entries(t.vars ?? {}).map(([key, value]) => ({ key, value })),
      rows: [],
    }));
  }

  function setNoteCols(cols: string[]) {
    // Mantén [No, Nombre] y reemplaza las columnas de notas; ajusta filas.
    const newColumns = [v.columns[0] ?? "NO.", v.columns[1] ?? "NOMBRE DEL ALUMNO", ...cols];
    setV((p) => ({
      ...p,
      columns: newColumns,
      rows: p.rows.map((r) => ({
        name: r.name,
        values: cols.map((_, i) => r.values[i] ?? ""),
      })),
    }));
  }

  function addRowsFromStudents() {
    const existing = new Set(v.rows.map((r) => r.name));
    const add = students
      .filter((s) => !existing.has(s.fullName))
      .map((s) => ({ name: s.fullName, values: noteCols.map(() => "") }));
    set("rows", [...v.rows, ...add]);
  }

  function buildPayload() {
    const tableCols = usesTable ? v.columns : ["NO.", "NOMBRE DEL ALUMNO"];
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
      columns: tableCols,
      rows: v.rows.map((r) => ({
        name: r.name,
        values: usesTable ? noteCols.map((_, i) => r.values[i] ?? "") : [],
      })),
      signers: v.signers.filter((s) => s.name.trim()),
      templateId: v.templateId,
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

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Datos */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Datos del acta</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>No. de acta *</label>
            <input required value={v.actaNumber} onChange={(e) => set("actaNumber", e.target.value)} className={inputClass} placeholder="02-2026" />
          </div>
          <div>
            <label className={labelClass}>Folios</label>
            <input value={v.folios} onChange={(e) => set("folios", e.target.value)} className={inputClass} placeholder="21,22" />
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
            <label className={labelClass}>Ciudad / lugar</label>
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
          Texto libre con marcadores. Inserta el cuadro de alumnos con{" "}
          <code>{"{{tabla}}"}</code> (con notas) o <code>{"{{lista}}"}</code> (solo nombres).
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
        <p className="mb-3 text-xs text-gray-500">Cada variable se usa en el cuerpo como <code>{"{{clave}}"}</code> (ej. <b>directora</b>, <b>fase</b>).</p>
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
              <button type="button" onClick={() => set("rows", [...v.rows, { name: "", values: noteCols.map(() => "") }])} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">+ Manual</button>
            </div>
          </div>

          {usesTable && (
            <div className="mb-3">
              <label className={labelClass}>Columnas de notas</label>
              <div className="flex flex-wrap items-center gap-2">
                {noteCols.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input value={c} onChange={(e) => setNoteCols(noteCols.map((x, j) => j === i ? e.target.value : x))} className={`${inputClass} w-36`} placeholder="Encabezado" />
                    {noteCols.length > 1 && (
                      <button type="button" onClick={() => setNoteCols(noteCols.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNoteCols([...noteCols, "Nota"])} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50">+ Columna</button>
              </div>
              <p className="mt-1 text-xs text-gray-400">Ej. Izabal usa Teoría · Práctica · Nota Obtenida.</p>
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
                  {usesTable && noteCols.map((_, c) => (
                    <input key={c} value={r.values[c] ?? ""} onChange={(e) => set("rows", v.rows.map((x, j) => j === i ? { ...x, values: noteCols.map((_, k) => k === c ? e.target.value : (x.values[k] ?? "")) } : x))} className={`${inputClass} w-20`} placeholder={noteCols[c]?.slice(0, 6)} />
                  ))}
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
        <p className="mb-3 text-xs text-gray-500">El primero lleva la firma; el sello va a la derecha. Los demás aparecen como “Vo.Bo.”. Cada firmante estampa su firma registrada.</p>

        {signatories.length > 0 && (
          <div className="mb-3">
            <select
              defaultValue=""
              onChange={(e) => {
                const sig = signatories.find((x) => x.id === e.target.value);
                if (sig)
                  set("signers", [
                    ...v.signers.filter((s) => s.name.trim()),
                    { name: sig.name, role: sig.role, signatureKey: sig.signatureKey },
                  ]);
                e.target.value = "";
              }}
              className={inputClass}
            >
              <option value="">+ Agregar firmante del catálogo…</option>
              {signatories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.role}
                  {s.sede ? ` (${s.sede})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          {v.signers.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={s.name} onChange={(e) => set("signers", v.signers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputClass} placeholder="Nombre" />
              <input value={s.role} onChange={(e) => set("signers", v.signers.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} className={`${inputClass} w-48`} placeholder="Cargo" />
              <span className="shrink-0 text-xs" title={s.signatureKey ? "Con firma registrada" : "Sin firma (solo texto)"}>
                {s.signatureKey ? "✍️" : "—"}
              </span>
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
