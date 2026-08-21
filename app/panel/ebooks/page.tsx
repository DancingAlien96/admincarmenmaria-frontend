"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { EBOOK_CATEGORIES, type Ebook } from "@/lib/types";

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function EbooksAdminPage() {
  const [ebooks, setEbooks] = useState<Ebook[] | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState(EBOOK_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await api<{ ebooks: Ebook[] }>("/api/ebooks?all=true");
    setEbooks(r.ebooks);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      alert("Sube el archivo del material (PDF).");
      return;
    }
    setBusy(true);
    try {
      const up = await uploadFile(file);
      let coverUrl: string | undefined;
      let coverKey: string | undefined;
      if (cover) {
        const c = await uploadFile(cover);
        coverUrl = c.url;
        coverKey = c.key;
      }
      await api("/api/ebooks", {
        method: "POST",
        body: {
          title,
          author,
          category,
          description,
          fileUrl: up.url,
          fileKey: up.key,
          coverUrl,
          coverKey,
          sizeLabel: sizeLabel(up.size),
        },
      });
      setTitle("");
      setAuthor("");
      setDescription("");
      setFile(null);
      setCover(null);
      if (fileRef.current) fileRef.current.value = "";
      if (coverRef.current) coverRef.current.value = "";
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este material? Se borra también su archivo.")) return;
    try {
      await api(`/api/ebooks/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Biblioteca (E-Books)
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Material de apoyo descargable para los estudiantes. Sube PDFs u otros
        documentos; aparecen en el portal del alumno, sección Biblioteca.
      </p>

      <form
        onSubmit={agregar}
        className="mb-8 space-y-3 rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Título *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Autor</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {EBOOK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">
              Archivo (PDF) *
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Portada (opcional, imagen)
          </label>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim() || !file}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Subiendo…" : "Agregar material"}
        </button>
      </form>

      {!ebooks ? (
        <p className="text-gray-400">Cargando…</p>
      ) : ebooks.length === 0 ? (
        <p className="text-sm text-gray-400">Aún no hay material.</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {ebooks.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
                {e.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl">📘</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{e.title}</p>
                <p className="truncate text-xs text-gray-500">
                  {[e.category, e.author, e.sizeLabel].filter(Boolean).join(" · ")}
                </p>
              </div>
              <a
                href={e.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                Ver
              </a>
              <button
                onClick={() => void eliminar(e.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
