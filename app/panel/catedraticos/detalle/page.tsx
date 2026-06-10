"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { TEACHER_DOC_LABELS, TEACHER_ROLE_LABELS } from "@/lib/labels";
import type { TeacherDetail, TeacherDocType } from "@/lib/types";
import { TeacherForm, type TeacherFormValues } from "@/components/teacher-form";

const DOC_TYPES = Object.keys(TEACHER_DOC_LABELS) as TeacherDocType[];

function toForm(t: TeacherDetail): TeacherFormValues {
  return {
    fullName: t.fullName,
    dpi: t.dpi ?? "",
    phone: t.phone ?? "",
    email: t.email ?? "",
    title: t.title ?? "",
    collegiate: t.collegiate ?? "",
    specialty: t.specialty ?? "",
    notes: t.notes ?? "",
    roles: t.roles,
  };
}

function TeacherDetailInner() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { teacher } = await api<{ teacher: TeacherDetail }>(
        `/api/teachers/${id}`
      );
      setTeacher(teacher);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-gray-400">Cargando…</p>;
  if (!teacher) return <p className="text-gray-500">Catedrático no encontrado.</p>;

  async function saveEdit(v: TeacherFormValues) {
    await api(`/api/teachers/${id}`, { method: "PATCH", body: v });
    setEditing(false);
    await load();
  }

  async function deactivate() {
    if (!confirm("¿Desactivar este catedrático?")) return;
    await api(`/api/teachers/${id}`, { method: "DELETE" });
    router.replace("/panel/catedraticos");
  }

  return (
    <div>
      <Link href="/panel/catedraticos" className="text-sm text-brand-600 hover:underline">
        ← Volver a catedráticos
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-800">{teacher.fullName}</h1>
          {!teacher.active && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              Inactivo
            </span>
          )}
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Editar
            </button>
            {teacher.active && (
              <button
                onClick={() => void deactivate()}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Desactivar
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div>
          <div className="mb-3 flex justify-end">
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:underline">
              Cancelar edición
            </button>
          </div>
          <TeacherForm initial={toForm(teacher)} submitLabel="Guardar cambios" onSubmit={saveEdit} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <InfoCard teacher={teacher} />
            <DocumentsCard teacher={teacher} onChange={load} />
          </div>
          <RolesCard teacher={teacher} />
        </div>
      )}
    </div>
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

function InfoCard({ teacher }: { teacher: TeacherDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Información</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="DPI" value={teacher.dpi} />
        <Field label="Teléfono" value={teacher.phone} />
        <Field label="Correo" value={teacher.email} />
        <Field label="Título / profesión" value={teacher.title} />
        <Field label="No. colegiado" value={teacher.collegiate} />
        <Field label="Especialidad" value={teacher.specialty} />
      </dl>
      {teacher.notes && (
        <div className="mt-4">
          <dt className="text-xs uppercase text-gray-400">Notas</dt>
          <dd className="text-sm text-gray-700">{teacher.notes}</dd>
        </div>
      )}
    </section>
  );
}

function RolesCard({ teacher }: { teacher: TeacherDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Roles</h2>
      {teacher.roles.length === 0 ? (
        <p className="text-sm text-gray-400">Sin roles asignados.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {teacher.roles.map((r) => (
            <span
              key={r}
              className="rounded-full bg-brand-100 px-2.5 py-1 text-sm font-medium text-brand-800"
            >
              {TEACHER_ROLE_LABELS[r]}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentsCard({
  teacher,
  onChange,
}: {
  teacher: TeacherDetail;
  onChange: () => Promise<void>;
}) {
  const [type, setType] = useState<TeacherDocType>("CV");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const up = await uploadFile(file);
      await api(`/api/teachers/${teacher.id}/documents`, {
        method: "POST",
        body: { type, fileName: up.name, fileUrl: up.url, fileKey: up.key },
      });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function remove(docId: string) {
    await api(`/api/teachers/${teacher.id}/documents/${docId}`, { method: "DELETE" });
    await onChange();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Documentos (CV, título, DPI…)</h2>

      {teacher.documents.length === 0 ? (
        <p className="text-sm text-gray-400">Sin documentos adjuntos.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {teacher.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-gray-800">
                  {TEACHER_DOC_LABELS[d.type]}
                </p>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {d.fileName}
                </a>
              </div>
              <button onClick={() => void remove(d.id)} className="text-xs text-red-600 hover:underline">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TeacherDocType)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {TEACHER_DOC_LABELS[t]}
              </option>
            ))}
          </select>
          <label
            className={`inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
              uploading ? "cursor-not-allowed bg-brand-400" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {uploading ? "Subiendo…" : "Subir documento"}
            <input
              type="file"
              accept="application/pdf,image/*"
              disabled={uploading}
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </section>
  );
}

export default function TeacherDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <TeacherDetailInner />
    </Suspense>
  );
}
