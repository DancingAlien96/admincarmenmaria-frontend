"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  canAccess,
  DOC_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";
import type { DocumentType, StudentDetail, StudentStatus } from "@/lib/types";
import {
  StudentForm,
  type StudentFormValues,
} from "@/components/student-form";
import { uploadFile } from "@/lib/upload";

const STATUSES: StudentStatus[] = ["ACTIVO", "EGRESADO", "BAJA"];
const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as DocumentType[];

function toFormValues(s: StudentDetail): StudentFormValues {
  return {
    fullName: s.fullName,
    dpi: s.dpi,
    birthDate: s.birthDate ? s.birthDate.slice(0, 10) : "",
    department: s.department ?? "",
    municipality: s.municipality ?? "",
    address: s.address ?? "",
    phonePrimary: s.phonePrimary ?? "",
    phoneAlt: s.phoneAlt ?? "",
    email: s.email ?? "",
    guardians: s.guardians.map((g) => ({
      name: g.name,
      relationship: g.relationship ?? "",
      phone: g.phone ?? "",
      email: g.email ?? "",
    })),
  };
}

function StudentDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { user } = useAuth();
  const canEdit = canAccess(user, "STUDENTS", "EDITOR");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { student } = await api<{ student: StudentDetail }>(
        `/api/students/${id}`
      );
      setStudent(student);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-gray-400">Cargando expediente…</p>;
  }
  if (!student) {
    return <p className="text-gray-500">Expediente no encontrado.</p>;
  }

  async function saveEdit(values: StudentFormValues) {
    await api(`/api/students/${id}`, {
      method: "PATCH",
      body: {
        fullName: values.fullName,
        dpi: values.dpi,
        birthDate: values.birthDate || null,
        department: values.department,
        municipality: values.municipality,
        address: values.address,
        phonePrimary: values.phonePrimary,
        phoneAlt: values.phoneAlt,
        email: values.email,
        guardians: values.guardians,
      },
    });
    setEditing(false);
    await load();
  }

  return (
    <div>
      <Link
        href="/panel/estudiantes"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver a expedientes
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-800">
            {student.fullName}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[student.status]}`}
          >
            {STATUS_LABELS[student.status]}
          </span>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Editar datos
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancelar edición
            </button>
          </div>
          <StudentForm
            initial={toFormValues(student)}
            submitLabel="Guardar cambios"
            onSubmit={saveEdit}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <InfoCard student={student} />
            <DocumentsCard
              student={student}
              canEdit={canEdit}
              onChange={load}
            />
          </div>
          <div className="space-y-6">
            {canEdit && <StatusCard student={student} onChange={load} />}
            <HistoryCard student={student} />
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams requiere un limite de Suspense en exportacion estatica.
export default function StudentDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <StudentDetailInner />
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

function InfoCard({ student }: { student: StudentDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Datos personales</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="DPI" value={student.dpi} />
        <Field
          label="Fecha de nacimiento"
          value={student.birthDate?.slice(0, 10)}
        />
        <Field label="Departamento" value={student.department} />
        <Field label="Municipio" value={student.municipality} />
        <Field label="Dirección" value={student.address} />
        <Field label="Teléfono principal" value={student.phonePrimary} />
        <Field label="Teléfono alternativo" value={student.phoneAlt} />
        <Field label="Correo" value={student.email} />
        <Field
          label="Fecha de inscripción"
          value={student.enrollmentDate.slice(0, 10)}
        />
      </dl>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-800">
        Personas responsables
      </h3>
      {student.guardians.length === 0 ? (
        <p className="text-sm text-gray-400">Sin responsables registrados.</p>
      ) : (
        <ul className="space-y-2">
          {student.guardians.map((g) => (
            <li
              key={g.id}
              className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <span className="font-medium">{g.name}</span>
              {g.relationship && ` · ${g.relationship}`}
              {g.phone && ` · ${g.phone}`}
              {g.email && ` · ${g.email}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocumentsCard({
  student,
  canEdit,
  onChange,
}: {
  student: StudentDetail;
  canEdit: boolean;
  onChange: () => Promise<void>;
}) {
  const [type, setType] = useState<DocumentType>("DPI");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      // Sube al backend (optimiza imagenes) y registra la referencia.
      const uploaded = await uploadFile(file);
      await api(`/api/students/${student.id}/documents`, {
        method: "POST",
        body: {
          type,
          fileName: uploaded.name,
          fileUrl: uploaded.url,
          fileKey: uploaded.key,
        },
      });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // permite volver a subir el mismo archivo
    }
  }

  async function remove(docId: string) {
    await api(`/api/students/${student.id}/documents/${docId}`, {
      method: "DELETE",
    });
    await onChange();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Documentos digitales</h2>

      {student.documents.length === 0 ? (
        <p className="text-sm text-gray-400">Sin documentos adjuntos.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {student.documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <p className="font-medium text-gray-800">
                  {DOC_TYPE_LABELS[d.type]}
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
              {canEdit && (
                <button
                  onClick={() => void remove(d.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Selecciona el tipo y sube el archivo (PDF o imagen, máx. 8MB).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              disabled={isUploading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <label
              className={`flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
                isUploading
                  ? "cursor-not-allowed bg-brand-400"
                  : "bg-brand-600 hover:bg-brand-700"
              }`}
            >
              {isUploading ? "Subiendo…" : "Subir documento"}
              <input
                type="file"
                accept="application/pdf,image/*"
                disabled={isUploading}
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}

function StatusCard({
  student,
  onChange,
}: {
  student: StudentDetail;
  onChange: () => Promise<void>;
}) {
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/students/${student.id}/status`, {
        method: "POST",
        body: { status, reason },
      });
      setReason("");
      await onChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Cambiar estado</h2>
      <form onSubmit={save} className="space-y-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StudentStatus)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Motivo del cambio (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || status === student.status}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Actualizar estado"}
        </button>
      </form>
    </section>
  );
}

function HistoryCard({ student }: { student: StudentDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">
        Historial de estados
      </h2>
      <ol className="space-y-3">
        {student.statusHistory.map((h) => (
          <li key={h.id} className="border-l-2 border-brand-200 pl-3">
            <p className="text-sm font-medium text-gray-800">
              {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ""}
              {STATUS_LABELS[h.toStatus]}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(h.createdAt).toLocaleString("es-GT")}
              {h.changedBy ? ` · ${h.changedBy.name}` : ""}
            </p>
            {h.reason && (
              <p className="mt-1 text-xs text-gray-500">{h.reason}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
