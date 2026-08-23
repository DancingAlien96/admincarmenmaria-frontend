"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { type FaseContentItem, type FaseItemKind } from "@/lib/types";

const FASES = [
  { fase: 1, nombre: "Fase I", subtitulo: "Fundamentos Básicos" },
  { fase: 2, nombre: "Fase II", subtitulo: "Fundamentos Clínicos" },
  { fase: 3, nombre: "Fase III", subtitulo: "Práctica Supervisada" },
];

const SECCIONES: { kind: FaseItemKind; titulo: string; icon: string }[] = [
  { kind: "TAREA", titulo: "Tareas", icon: "📝" },
  { kind: "ACTIVIDAD", titulo: "Actividades", icon: "🧪" },
  { kind: "EXAMEN", titulo: "Exámenes", icon: "📄" },
  { kind: "MATERIAL", titulo: "Materiales", icon: "📚" },
];

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function DocenteFasesPage() {
  const [fase, setFase] = useState(1);
  const [items, setItems] = useState<FaseContentItem[] | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ items: FaseContentItem[] }>("/api/fase-content");
    setItems(r.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const delItem = async (id: string) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    try {
      await api(`/api/fase-content/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  };

  const actual = FASES.find((f) => f.fase === fase)!;
  const delFase = (items ?? []).filter((i) => i.fase === fase);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Gestión de Fases
      </h1>
      <p className="mb-5 text-sm text-gray-500">
        Publica tareas, actividades, exámenes y materiales para cada fase. Tus
        estudiantes los verán en su portal.
      </p>

      {/* Tabs de fase */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FASES.map((f) => (
          <button
            key={f.fase}
            onClick={() => setFase(f.fase)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              fase === f.fase
                ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.nombre}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-gray-500">
        <span className="font-semibold text-brand-800">{actual.nombre}</span> ·{" "}
        {actual.subtitulo}
      </p>

      {!items ? (
        <p className="text-gray-400">Cargando…</p>
      ) : (
        <div className="space-y-5">
          {SECCIONES.map((sec) => (
            <SeccionCard
              key={sec.kind}
              fase={fase}
              kind={sec.kind}
              titulo={sec.titulo}
              icon={sec.icon}
              items={delFase.filter((i) => i.kind === sec.kind)}
              onChange={load}
              onDelete={delItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SeccionCard({
  fase,
  kind,
  titulo,
  icon,
  items,
  onChange,
  onDelete,
}: {
  fase: number;
  kind: FaseItemKind;
  titulo: string;
  icon: string;
  items: FaseContentItem[];
  onChange: () => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [meta, setMeta] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const esMaterial = kind === "MATERIAL";

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (esMaterial && !file) {
      alert("Sube el archivo del material.");
      return;
    }
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      let fileKey: string | undefined;
      let size: string | undefined;
      if (esMaterial && file) {
        const up = await uploadFile(file);
        fileUrl = up.url;
        fileKey = up.key;
        size = sizeLabel(up.size);
      }
      await api("/api/fase-content", {
        method: "POST",
        body: {
          fase,
          kind,
          title,
          description,
          date: date || null,
          meta: meta || null,
          fileUrl,
          fileKey,
          sizeLabel: size,
        },
      });
      setTitle("");
      setDescription("");
      setDate("");
      setMeta("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setAdding(false);
      onChange();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">
          {icon} {titulo}
        </h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          {adding ? "Cerrar" : "+ Agregar"}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nada publicado aún.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{it.title}</p>
                {it.description && (
                  <p className="text-xs text-gray-500">{it.description}</p>
                )}
                <p className="text-[11px] text-gray-400">
                  {[
                    it.date ? it.date.slice(0, 10) : null,
                    it.meta,
                    it.sizeLabel,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {it.fileUrl && (
                <a
                  href={it.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline"
                >
                  Ver
                </a>
              )}
              <button
                onClick={() => onDelete(it.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={agregar} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {!esMaterial ? (
              <input
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder={
                  kind === "EXAMEN"
                    ? "Tipo / duración (ej. Parcial · 90 min)"
                    : kind === "ACTIVIDAD"
                      ? "Tipo (práctica, taller…)"
                      : "Detalle (opcional)"
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            ) : (
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}
    </section>
  );
}
