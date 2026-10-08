"use client";

import {
  CircleCheck,
  CircleX,
  Clock,
  Download,
  FileSignature,
  FileText,
  Info,
  PenLine,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import type { MatriculaInfo } from "@/lib/types";

const ESTADO = {
  EN_REVISION: {
    label: "En revisión",
    chip: "bg-amber-50 text-amber-700",
    icon: Clock,
    texto: "La escuela está revisando tu matrícula. Te avisaremos cuando quede aprobada.",
  },
  APROBADA: {
    label: "Aprobada",
    chip: "bg-green-50 text-green-700",
    icon: CircleCheck,
    texto: "Tu matrícula de este año está aprobada. No necesitas hacer nada más.",
  },
  RECHAZADA: {
    label: "Rechazada",
    chip: "bg-red-50 text-red-700",
    icon: CircleX,
    texto: "Revisa el motivo, corrige el formulario y vuelve a subirlo.",
  },
} as const;

function fmtFecha(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function MatriculaPage() {
  const [data, setData] = useState<MatriculaInfo | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setData(await api<MatriculaInfo>("/api/portal/matricula"));
  }

  useEffect(() => {
    api<MatriculaInfo>("/api/portal/matricula").then(setData).catch(() => undefined);
  }, []);

  async function subir(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      alert("Sube tu matrícula firmada en formato PDF.");
      return;
    }
    setSubiendo(true);
    try {
      const up = await uploadFile(file);
      await api("/api/portal/matricula", {
        method: "POST",
        body: { fileUrl: up.url, fileKey: up.key, fileName: file.name },
      });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo subir tu matrícula");
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!data) return <p className="text-gray-400">Cargando…</p>;

  const m = data.actual;
  const est = m ? ESTADO[m.status] : null;
  const puedeSubir = !m || m.status !== "APROBADA";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Matrícula {data.year}</h2>
        <p className="text-sm text-gray-500">
          Descarga el formulario, fírmalo y súbelo en PDF
        </p>
      </div>

      {/* Estado actual */}
      {m && est && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${est.chip}`}>
            <est.icon aria-hidden className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-gray-900">Tu matrícula</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${est.chip}`}>
                {est.label}
              </span>
            </div>
            <p className="text-sm text-gray-600">{est.texto}</p>
            {m.status === "RECHAZADA" && m.note && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                <b>Motivo:</b> {m.note}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Enviada el {fmtFecha(m.uploadedAt)}
              {m.reviewedAt ? ` · revisada el ${fmtFecha(m.reviewedAt)}` : ""}
            </p>
          </div>
          <a
            href={m.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText aria-hidden className="h-4 w-4" />
            Ver mi PDF
          </a>
        </section>
      )}

      {/* Pasos */}
      {puedeSubir && (
        <section className="grid gap-4 md:grid-cols-3">
          <Paso n={1} icon={Download} titulo="Descarga el formulario">
            {data.template ? (
              <a
                href={data.template.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                <Download aria-hidden className="h-4 w-4" />
                Descargar formulario
              </a>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                La escuela aún no ha publicado el formulario. Pídelo en
                administración.
              </p>
            )}
          </Paso>
          <Paso n={2} icon={PenLine} titulo="Imprímelo y fírmalo">
            <p className="mt-2 text-sm text-gray-500">
              Llena tus datos, firma donde se indica y escanéalo o tómale foto
              para convertirlo a PDF.
            </p>
          </Paso>
          <Paso n={3} icon={Upload} titulo="Sube el PDF firmado">
            <label
              className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 ${
                subiendo ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <Upload aria-hidden className="h-4 w-4" />
              {subiendo ? "Subiendo…" : m ? "Volver a subir" : "Subir PDF"}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => void subir(e.target.files?.[0])}
              />
            </label>
            <p className="mt-2 text-xs text-gray-400">Solo PDF.</p>
          </Paso>
        </section>
      )}

      {data.historial.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">
            Matrículas anteriores
          </p>
          <ul className="divide-y divide-gray-100">
            {data.historial.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <FileSignature aria-hidden className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-gray-800">Matrícula {h.year}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${ESTADO[h.status].chip}`}>
                  {ESTADO[h.status].label}
                </span>
                <a
                  href={h.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  Ver
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
        <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        La matrícula se renueva cada año. Si tienes dudas sobre el formulario,
        comunícate con la administración de la escuela.
      </p>
    </div>
  );
}

function Paso({
  n,
  icon: Icon,
  titulo,
  children,
}: {
  n: number;
  icon: typeof Download;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
          {n}
        </span>
        <span className="flex items-center gap-2 font-semibold text-gray-900">
          <Icon aria-hidden className="h-4 w-4 text-brand-600" />
          {titulo}
        </span>
      </div>
      {children}
    </div>
  );
}
