"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Ebook } from "@/lib/types";

export default function PortalEbooksPage() {
  const [ebooks, setEbooks] = useState<Ebook[] | null>(null);
  const [cat, setCat] = useState("Todas");

  useEffect(() => {
    api<{ ebooks: Ebook[] }>("/api/ebooks")
      .then((r) => setEbooks(r.ebooks))
      .catch(() => setEbooks([]));
  }, []);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    (ebooks ?? []).forEach((e) => e.category && set.add(e.category));
    return ["Todas", ...Array.from(set).sort((a, b) => a.localeCompare(b, "es"))];
  }, [ebooks]);

  const visibles = (ebooks ?? []).filter(
    (e) => cat === "Todas" || e.category === cat
  );

  if (!ebooks) {
    return <p className="text-gray-400">Cargando biblioteca…</p>;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Biblioteca
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Material de apoyo para tu formación. Descárgalo cuando quieras.
      </p>

      {ebooks.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-3xl">📚</p>
          <p className="mt-2 text-gray-600">Aún no hay material disponible.</p>
          <p className="text-sm text-gray-400">
            La escuela irá agregando libros y guías aquí.
          </p>
        </div>
      ) : (
        <>
          {categorias.length > 2 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {categorias.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    cat === c
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((e) => (
              <div
                key={e.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100">
                  {e.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.coverUrl}
                      alt={e.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">📘</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {e.category && (
                    <span className="mb-1 inline-block w-fit rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      {e.category}
                    </span>
                  )}
                  <h3 className="font-semibold leading-snug text-gray-800">
                    {e.title}
                  </h3>
                  {e.author && (
                    <p className="mt-0.5 text-xs text-gray-500">{e.author}</p>
                  )}
                  {e.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                      {e.description}
                    </p>
                  )}
                  <a
                    href={e.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Descargar{e.sizeLabel ? ` · ${e.sizeLabel}` : ""}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
