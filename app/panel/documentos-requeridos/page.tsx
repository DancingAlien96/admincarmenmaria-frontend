"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FileSignature, FileText } from "lucide-react";
import { uploadFile } from "@/lib/upload";
import type { DocRequirement } from "@/lib/types";

export default function DocumentosRequeridosPage() {
  const [reqs, setReqs] = useState<DocRequirement[] | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(
    null
  );

  const load = useCallback(async () => {
    const r = await api<{ requirements: DocRequirement[] }>(
      "/api/doc-checklist/requirements?all=true"
    );
    setReqs(r.requirements);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setBusy(true);
    try {
      await api("/api/doc-checklist/requirements", {
        method: "POST",
        body: { name: nuevo.trim() },
      });
      setNuevo("");
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  async function guardarNombre(id: string, name: string) {
    try {
      await api(`/api/doc-checklist/requirements/${id}`, {
        method: "PATCH",
        body: { name },
      });
      setEditing(null);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    }
  }

  async function toggleActivo(r: DocRequirement) {
    try {
      await api(`/api/doc-checklist/requirements/${r.id}`, {
        method: "PATCH",
        body: { active: !r.active },
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo cambiar");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-brand-800">
        Documentos requeridos
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Este es el checklist de documentos que se pide a cada estudiante para su
        expediente. Puedes agregar, renombrar o desactivar documentos cuando
        quieras; los cambios se reflejan en todos los expedientes y en el portal
        del alumno.
      </p>

      <MatriculaTemplateCard />

      <form onSubmit={agregar} className="mb-6 flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nuevo documento (ej. Fotografías tamaño cédula)"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Agregar
        </button>
      </form>

      {!reqs ? (
        <p className="text-gray-400">Cargando…</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {reqs.map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                r.active ? "" : "bg-gray-50"
              }`}
            >
              <span className="w-6 text-sm text-gray-400">{i + 1}</span>
              {editing?.id === r.id ? (
                <>
                  <input
                    value={editing.value}
                    onChange={(e) =>
                      setEditing({ id: r.id, value: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => void guardarNombre(r.id, editing.value)}
                    className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs text-gray-500"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 text-sm ${
                      r.active ? "text-gray-800" : "text-gray-400 line-through"
                    }`}
                  >
                    {r.name}
                  </span>
                  <button
                    onClick={() => setEditing({ id: r.id, value: r.name })}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Renombrar
                  </button>
                  <button
                    onClick={() => void toggleActivo(r)}
                    className={`text-xs hover:underline ${
                      r.active ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Formulario de matrícula (plantilla en PDF) que descargan los alumnos.
function MatriculaTemplateCard() {
  const [tpl, setTpl] = useState<{ url: string; key: string; name: string } | null>(null);
  const [cargado, setCargado] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ template: { url: string; key: string; name: string } | null }>(
      "/api/matricula/template"
    )
      .then((r) => setTpl(r.template))
      .finally(() => setCargado(true));
  }, []);

  async function subir(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      alert("El formulario debe ser un PDF.");
      return;
    }
    setBusy(true);
    try {
      const up = await uploadFile(file);
      const r = await api<{ template: typeof tpl }>("/api/matricula/template", {
        method: "PUT",
        body: { url: up.url, key: up.key, name: file.name },
      });
      setTpl(r.template);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo subir");
    } finally {
      setBusy(false);
    }
  }

  async function quitar() {
    if (!confirm("¿Quitar el formulario de matrícula? Los alumnos ya no podrán descargarlo.")) return;
    await api("/api/matricula/template", { method: "DELETE" });
    setTpl(null);
  }

  return (
    <section className="mb-8 rounded-xl border border-brand-200 bg-brand-50/40 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-brand-800">
        <FileSignature aria-hidden className="h-5 w-5" />
        Formulario de matrícula
      </h2>
      <p className="mb-3 text-sm text-gray-600">
        El PDF en blanco que los alumnos descargan, firman y suben en su
        portal (sección Matrícula). La revisión se hace en el expediente de
        cada alumno.
      </p>
      {!cargado ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {tpl ? (
            <a
              href={tpl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <FileText aria-hidden className="h-4 w-4 text-red-500" />
              {tpl.name}
            </a>
          ) : (
            <span className="text-sm text-gray-500">Aún no hay formulario publicado.</span>
          )}
          <label
            className={`cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {busy ? "Subiendo…" : tpl ? "Reemplazar PDF" : "Subir PDF"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                void subir(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {tpl && (
            <button onClick={() => void quitar()} className="text-sm text-red-600 hover:underline">
              Quitar
            </button>
          )}
        </div>
      )}
    </section>
  );
}
