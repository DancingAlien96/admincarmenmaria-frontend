"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
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
