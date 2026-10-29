"use client";

import { Download, FileQuestion, X } from "lucide-react";
import { useEffect, useState } from "react";

// Visor de archivos en ventana emergente (materiales de clase): PDF, imágenes,
// video, audio y documentos de Office se ven sin salir del sistema; cualquier
// archivo se puede descargar desde aquí.

type Tipo = "pdf" | "imagen" | "video" | "audio" | "office" | "otro";

function extension(url: string): string {
  return (url.split("?")[0].split("#")[0].split(".").pop() ?? "").toLowerCase();
}

function tipoDe(url: string): Tipo {
  const ext = extension(url);
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "imagen";
  if (["mp4", "webm", "mov", "m4v", "ogv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "oga", "aac"].includes(ext)) return "audio";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "office";
  return "otro";
}

// El visor en línea de Microsoft necesita que el archivo sea público por https
// (en producción lo es; en local no).
function officeViewer(url: string): string | null {
  return /^https:\/\//i.test(url)
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : null;
}

async function descargar(url: string, nombre: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    // Si no se pudo bajar como archivo, se abre directo (el navegador lo descarga)
    window.open(url, "_blank", "noopener");
  }
}

export function FileViewer({
  url,
  titulo,
  onClose,
}: {
  url: string;
  titulo: string;
  onClose: () => void;
}) {
  const tipo = tipoDe(url);
  const ext = extension(url);
  const nombre = /\.[a-z0-9]{1,8}$/i.test(titulo) ? titulo : `${titulo}.${ext}`;
  const office = tipo === "office" ? officeViewer(url) : null;
  const [bajando, setBajando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const vistaPrevia =
    tipo === "pdf" || (tipo === "office" && office) || tipo === "imagen" || tipo === "video" || tipo === "audio";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-2 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <p className="min-w-0 truncate font-semibold text-gray-900">{titulo}</p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={async () => {
                setBajando(true);
                await descargar(url, nombre);
                setBajando(false);
              }}
              disabled={bajando}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Download aria-hidden className="h-4 w-4" />
              {bajando ? "Descargando…" : "Descargar"}
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-100">
          {tipo === "pdf" && <iframe src={url} title={titulo} className="h-full w-full border-0 bg-white" />}
          {tipo === "office" && office && (
            <iframe src={office} title={titulo} className="h-full w-full border-0 bg-white" />
          )}
          {tipo === "imagen" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={titulo} className="max-h-full max-w-full object-contain" />
          )}
          {tipo === "video" && (
            <video src={url} controls className="max-h-full max-w-full bg-black">
              Tu navegador no puede reproducir este video.
            </video>
          )}
          {tipo === "audio" && <audio src={url} controls className="w-full max-w-md" />}
          {!vistaPrevia && (
            <div className="max-w-sm p-6 text-center">
              <FileQuestion aria-hidden className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-3 font-medium text-gray-800">
                No hay vista previa para este tipo de archivo{ext ? ` (.${ext})` : ""}
              </p>
              <p className="mt-1 text-sm text-gray-500">Descárgalo para abrirlo en tu dispositivo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
