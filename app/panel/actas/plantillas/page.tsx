"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { ActaSigner, ActaTemplate } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

interface Draft {
  id?: string;
  name: string;
  title: string;
  body: string;
  block: "" | "tabla" | "lista";
  valueLabel: string;
  signers: ActaSigner[];
  vars: { key: string; value: string }[];
}

const emptyDraft: Draft = {
  name: "",
  title: "",
  body: "",
  block: "",
  valueLabel: "Nota Obtenida",
  signers: [{ name: "", role: "" }],
  vars: [],
};

export default function TemplatesPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "ACTAS", "EDITOR");
  const [list, setList] = useState<ActaTemplate[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ templates: ActaTemplate[] }>("/api/actas/templates");
    setList(r.templates);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function edit(t: ActaTemplate) {
    setError(null);
    setDraft({
      id: t.id,
      name: t.name,
      title: t.title ?? "",
      body: t.body,
      block: (t.block as Draft["block"]) ?? "",
      valueLabel: t.columns?.[2] ?? "Nota Obtenida",
      signers: t.signers && t.signers.length ? t.signers : [{ name: "", role: "" }],
      vars: Object.entries(t.vars ?? {}).map(([key, value]) => ({ key, value })),
    });
  }

  async function save() {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: draft.name,
        title: draft.title,
        body: draft.body,
        block: draft.block,
        columns:
          draft.block === "tabla"
            ? ["NO.", "NOMBRE DEL ALUMNO", draft.valueLabel]
            : draft.block === "lista"
              ? ["NO.", "NOMBRE DEL ALUMNO"]
              : [],
        signers: draft.signers.filter((s) => s.name.trim()),
        vars: Object.fromEntries(
          draft.vars.filter((x) => x.key.trim()).map((x) => [x.key.trim(), x.value])
        ),
      };
      if (draft.id) {
        await api(`/api/actas/templates/${draft.id}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/actas/templates", { method: "POST", body: payload });
      }
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al guardar la plantilla");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    await api(`/api/actas/templates/${id}`, { method: "DELETE" });
    await load();
  }

  function upd<K extends keyof Draft>(k: K, val: Draft[K]) {
    setDraft((d) => (d ? { ...d, [k]: val } : d));
  }

  return (
    <div>
      <Link href="/panel/actas" className="text-sm text-brand-600 hover:underline">
        ← Volver a actas
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-800">Plantillas de acta</h1>
        {canEdit && !draft && (
          <button onClick={() => setDraft({ ...emptyDraft })} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            + Nueva plantilla
          </button>
        )}
      </div>

      {!draft ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Bloque</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin plantillas.</td></tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.title ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{t.block ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <div className="flex justify-end gap-3">
                          <button onClick={() => edit(t)} className="text-xs text-brand-600 hover:underline">Editar</button>
                          <button onClick={() => void remove(t.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input value={draft.name} onChange={(e) => upd("name", e.target.value)} className={inputClass} placeholder="Calificaciones" />
              </div>
              <div>
                <label className={labelClass}>Título del acta</label>
                <input value={draft.title} onChange={(e) => upd("title", e.target.value)} className={inputClass} placeholder="Acta de Calificaciones" />
              </div>
              <div>
                <label className={labelClass}>Cuadro de alumnos</label>
                <select value={draft.block} onChange={(e) => upd("block", e.target.value as Draft["block"])} className={inputClass}>
                  <option value="">Ninguno</option>
                  <option value="tabla">Tabla con notas ({"{{tabla}}"})</option>
                  <option value="lista">Lista de nombres ({"{{lista}}"})</option>
                </select>
              </div>
              {draft.block === "tabla" && (
                <div>
                  <label className={labelClass}>Encabezado de la nota</label>
                  <input value={draft.valueLabel} onChange={(e) => upd("valueLabel", e.target.value)} className={inputClass} />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <label className={labelClass}>Cuerpo (con marcadores)</label>
            <textarea value={draft.body} onChange={(e) => upd("body", e.target.value)} rows={14} className={`${inputClass} font-mono text-xs leading-relaxed`} />
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-800">Variables por defecto</h2>
              <button type="button" onClick={() => upd("vars", [...draft.vars, { key: "", value: "" }])} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {draft.vars.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input value={row.key} onChange={(e) => upd("vars", draft.vars.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} className={`${inputClass} w-40`} placeholder="clave" />
                  <input value={row.value} onChange={(e) => upd("vars", draft.vars.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className={inputClass} placeholder="valor" />
                  <button type="button" onClick={() => upd("vars", draft.vars.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-600 hover:underline">Quitar</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-800">Firmantes por defecto</h2>
              <button type="button" onClick={() => upd("signers", [...draft.signers, { name: "", role: "" }])} className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {draft.signers.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.name} onChange={(e) => upd("signers", draft.signers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputClass} placeholder="Nombre" />
                  <input value={s.role} onChange={(e) => upd("signers", draft.signers.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} className={`${inputClass} w-48`} placeholder="Cargo" />
                  <button type="button" onClick={() => upd("signers", draft.signers.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-600 hover:underline">Quitar</button>
                </div>
              ))}
            </div>
          </section>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => setDraft(null)} className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => void save()} disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60">{saving ? "Guardando…" : "Guardar plantilla"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
