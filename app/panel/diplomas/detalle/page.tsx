"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, apiUrl, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { GraduateDetail } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

function GraduateDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  // Desde el lápiz de la lista: abre directamente el formulario de edición
  const editarAlAbrir = searchParams.get("editar") === "1";
  const { user } = useAuth();
  const canEdit = canAccess(user, "DIPLOMAS", "EDITOR");

  const [graduate, setGraduate] = useState<GraduateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { graduate } = await api<{ graduate: GraduateDetail }>(
        `/api/graduates/${id}`
      );
      setGraduate(graduate);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-gray-400">Cargando…</p>;
  if (!graduate) return <p className="text-gray-500">Egresado no encontrado.</p>;

  return (
    <div>
      <Link
        href="/panel/diplomas"
        className="text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft aria-hidden className="mr-1 inline h-4 w-4 align-[-3px]" />Volver a la banca de diplomas
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-brand-800">
          {graduate.fullName}
        </h1>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          {graduate.diplomaNumber}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <InfoCard
            graduate={graduate}
            canEdit={canEdit}
            startEditing={editarAlAbrir}
            onChange={load}
          />
          <DiplomaCard graduate={graduate} canEdit={canEdit} onChange={load} />
          <LettersCard graduate={graduate} canEdit={canEdit} onChange={load} />
        </div>
        <div className="space-y-6">
          <DocumentsActions graduate={graduate} />
        </div>
      </div>
    </div>
  );
}

// useSearchParams requiere un limite de Suspense en exportacion estatica.
export default function GraduateDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <GraduateDetailInner />
    </Suspense>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

type GraduateForm = {
  fullName: string;
  dpi: string;
  diplomaNumber: string;
  graduationDate: string;
  mspasCode: string;
  email: string;
  phone: string;
};

function formDe(g: GraduateDetail): GraduateForm {
  return {
    fullName: g.fullName,
    dpi: g.dpi ?? "",
    diplomaNumber: g.diplomaNumber,
    graduationDate: g.graduationDate.slice(0, 10),
    mspasCode: g.mspasCode ?? "",
    email: g.email ?? "",
    phone: g.phone ?? "",
  };
}

function InfoCard({
  graduate,
  canEdit,
  startEditing,
  onChange,
}: {
  graduate: GraduateDetail;
  canEdit: boolean;
  startEditing: boolean;
  onChange: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(canEdit && startEditing);
  const [form, setForm] = useState<GraduateForm>(() => formDe(graduate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof GraduateForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function cancelar() {
    setForm(formDe(graduate));
    setError(null);
    setEditando(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/api/graduates/${graduate.id}`, {
        method: "PATCH",
        body: {
          fullName: form.fullName.trim(),
          dpi: form.dpi.trim(),
          diplomaNumber: form.diplomaNumber.trim(),
          graduationDate: form.graduationDate,
          mspasCode: form.mspasCode.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
      });
      setEditando(false);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (editando) {
    return (
      <section className="rounded-xl border border-brand-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-brand-800">Editar datos del egresado</h2>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-700 sm:col-span-2">
              Nombre completo *
              <input
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                required
                minLength={3}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm text-gray-700">
              DPI
              <input
                value={form.dpi}
                onChange={(e) => set("dpi", e.target.value)}
                inputMode="numeric"
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm text-gray-700">
              No. de diploma *
              <input
                value={form.diplomaNumber}
                onChange={(e) => set("diplomaNumber", e.target.value)}
                required
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm text-gray-700">
              Fecha de graduación *
              <input
                type="date"
                value={form.graduationDate}
                onChange={(e) => set("graduationDate", e.target.value)}
                required
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm text-gray-700">
              Código MSPAS
              <input
                value={form.mspasCode}
                onChange={(e) => set("mspasCode", e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm text-gray-700">
              Correo
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm text-gray-700">
              Celular
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                inputMode="tel"
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button type="button" onClick={cancelar} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-brand-800">Datos del egresado</h2>
        {canEdit && (
          <button
            onClick={() => {
              setForm(formDe(graduate));
              setEditando(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil aria-hidden className="h-4 w-4" />
            Editar
          </button>
        )}
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="DPI" value={graduate.dpi} />
        <Field label="No. de diploma" value={graduate.diplomaNumber} />
        <Field label="Fecha de graduación" value={graduate.graduationDate.slice(0, 10)} />
        <Field label="Código MSPAS" value={graduate.mspasCode} />
        <Field label="Correo" value={graduate.email} />
        <Field label="Celular" value={graduate.phone} />
      </dl>
      {graduate.student && (
        <p className="mt-4 text-xs text-gray-400">
          Migrado desde el expediente de{" "}
          <Link
            href={`/panel/estudiantes/detalle?id=${graduate.student.id}`}
            className="text-brand-600 hover:underline"
          >
            {graduate.student.fullName}
          </Link>
        </p>
      )}
    </section>
  );
}

function DiplomaCard({
  graduate,
  canEdit,
  onChange,
}: {
  graduate: GraduateDetail;
  canEdit: boolean;
  onChange: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file);
      await api(`/api/graduates/${graduate.id}`, {
        method: "PATCH",
        body: {
          diplomaUrl: uploaded.url,
          diplomaKey: uploaded.key,
        },
      });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">
        Diploma / título escaneado
      </h2>
      {graduate.diplomaUrl ? (
        <div>
          <DiplomaPreview url={graduate.diplomaUrl} />
          <a
            href={graduate.diplomaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            Abrir en pestaña nueva / descargar
          </a>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Sin diploma adjunto.</p>
      )}

      {canEdit && (
        <div className="mt-4">
          <label
            className={`inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
              isUploading
                ? "cursor-not-allowed bg-brand-400"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {isUploading
              ? "Subiendo…"
              : graduate.diplomaUrl
                ? "Reemplazar diploma"
                : "Subir diploma"}
            <input
              type="file"
              accept="application/pdf,image/*"
              disabled={isUploading}
              onChange={handleFile}
              className="hidden"
            />
          </label>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}

// Vista previa incrustada del diploma: imagen <img> o PDF <iframe>.
function DiplomaPreview({ url }: { url: string }) {
  // Quita query params para detectar la extensión real del archivo
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(clean);
  const isPdf = /\.pdf$/.test(clean);

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Diploma del egresado"
        className="max-h-[480px] w-full rounded-lg border border-gray-200 object-contain"
      />
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={url}
        title="Diploma del egresado"
        className="h-[480px] w-full rounded-lg border border-gray-200"
      />
    );
  }

  // Tipo desconocido: no se puede incrustar
  return (
    <p className="text-sm text-gray-400">
      Vista previa no disponible para este tipo de archivo. Usa el botón de
      descarga.
    </p>
  );
}

function DocumentsActions({ graduate }: { graduate: GraduateDetail }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Documentos</h2>
      <div className="space-y-2">
        <a
          href={`${apiUrl}/api/graduates/${graduate.id}/constancia`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-brand-300 px-4 py-2 text-center text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Constancia de egreso (PDF)
        </a>
        <a
          href={`${apiUrl}/api/graduates/${graduate.id}/recommendation?date=${today}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-brand-300 px-4 py-2 text-center text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Carta de recomendación (PDF)
        </a>
      </div>
    </section>
  );
}

function LettersCard({
  graduate,
  canEdit,
  onChange,
}: {
  graduate: GraduateDetail;
  canEdit: boolean;
  onChange: () => Promise<void>;
}) {
  const [issueDate, setIssueDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/graduates/${graduate.id}/letters`, {
        method: "POST",
        body: { issueDate, notes },
      });
      setNotes("");
      await onChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">
        Cartas de recomendación emitidas
      </h2>

      {graduate.letters.length === 0 ? (
        <p className="text-sm text-gray-400">Ninguna registrada.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {graduate.letters.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="text-gray-700">
                {l.issueDate.slice(0, 10)}
                {l.notes && (
                  <span className="text-gray-400"> · {l.notes}</span>
                )}
              </span>
              <a
                href={`${apiUrl}/api/graduates/${graduate.id}/recommendation?date=${l.issueDate.slice(0, 10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                Descargar
              </a>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={add} className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Registrar emisión de una carta (se guarda para trazabilidad).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Nota (ej. para empleo)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Registrar carta"}
          </button>
        </form>
      )}
    </section>
  );
}
