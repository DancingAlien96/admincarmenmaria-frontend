"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiUrl, ApiError } from "@/lib/api";
import type { Signatory } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const SEDES = ["", "Chiquimula", "Morales Izabal"];

export default function FirmasPage() {
  const [items, setItems] = useState<Signatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [sede, setSede] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ signatories: Signatory[] }>("/api/signatories");
      setItems(r.signatories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona la imagen de la firma.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("role", role);
      fd.append("sede", sede);
      fd.append("file", file);
      const res = await fetch(`${apiUrl}/api/signatories`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "No se pudo guardar la firma");
      }
      setName("");
      setRole("");
      setSede("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function replaceImage(id: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${apiUrl}/api/signatories/${id}`, {
      method: "PATCH",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) {
      setError("No se pudo reemplazar la firma");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Dar de baja esta firma? Las actas ya emitidas no se afectan."))
      return;
    try {
      await api(`/api/signatories/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al dar de baja");
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-brand-800">
        Firmas del personal
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Registra las firmas del personal que firma las actas. Al crear un acta
        eliges el firmante y su firma se estampa. Si cambia el personal, das de
        baja la anterior y agregas la nueva — sin tocar el sistema.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Alta */}
      <form
        onSubmit={create}
        className="mb-6 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="mb-4 font-semibold text-brand-800">Agregar firma</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Lic. Héctor Manuel Sarmiento Reyes"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cargo *
            </label>
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
              placeholder="Secretario / Directora Técnica"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sede (opcional)
            </label>
            <select
              value={sede}
              onChange={(e) => setSede(e.target.value)}
              className={inputClass}
            >
              {SEDES.map((s) => (
                <option key={s} value={s}>
                  {s || "— Todas —"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Imagen de la firma * (PNG/JPG, fondo blanco)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Agregar firma"}
        </button>
      </form>

      {/* Listado */}
      {loading ? (
        <p className="text-gray-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400">Aún no hay firmas registradas.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex h-20 items-center justify-center rounded-lg bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.signatureUrl}
                  alt={`Firma de ${s.name}`}
                  className="max-h-16 object-contain"
                />
              </div>
              <p className="mt-3 font-medium text-gray-800">{s.name}</p>
              <p className="text-sm text-gray-500">{s.role}</p>
              {s.sede && (
                <p className="mt-0.5 text-xs text-gray-400">Sede: {s.sede}</p>
              )}
              <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 text-sm">
                <label className="cursor-pointer font-medium text-brand-600 hover:underline">
                  Reemplazar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void replaceImage(s.id, f);
                    }}
                  />
                </label>
                <button
                  onClick={() => void remove(s.id)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Dar de baja
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
