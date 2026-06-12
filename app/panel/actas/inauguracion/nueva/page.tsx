"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, apiUrl } from "@/lib/api";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export default function NewInauguracionPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [actaNumber, setActaNumber] = useState(`01-${currentYear}`);
  const [folios, setFolios] = useState("");
  const [promocion, setPromocion] = useState("");
  const [cohorte, setCohorte] = useState(String(currentYear));
  const [actoDate, setActoDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [directora, setDirectora] = useState("");
  const [docente, setDocente] = useState("");
  const [secretario, setSecretario] = useState("");

  const [students, setStudents] = useState<string[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function previewStudents() {
    setLoadingPreview(true);
    setError(null);
    try {
      const r = await api<{ students: string[] }>(
        `/api/inauguracion/cohort-students?year=${cohorte}`
      );
      setStudents(r.students);
      setPreviewed(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar alumnos");
    } finally {
      setLoadingPreview(false);
    }
  }

  function removeStudent(i: number) {
    setStudents((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (students.length === 0) {
      setError(
        "Carga la lista de alumnos de la cohorte (botón “Cargar alumnos del año”)."
      );
      return;
    }
    setSaving(true);
    try {
      const { acta } = await api<{ acta: { id: string } }>("/api/inauguracion", {
        method: "POST",
        body: {
          actaNumber,
          folios,
          promocion,
          cohorte: Number(cohorte),
          actoDate,
          closeDate,
          directora,
          docente,
          secretario,
          students,
        },
      });
      // Abre el PDF generado en una pestaña nueva y vuelve a la lista
      window.open(`${apiUrl}/api/inauguracion/${acta.id}/pdf`, "_blank");
      router.replace("/panel/actas?tab=inauguracion");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear el acta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        href="/panel/actas?tab=inauguracion"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver a actas de inauguración
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">
        Nueva acta de inauguración
      </h1>

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-brand-800">Datos del acta</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>No. de acta *</label>
              <input
                required
                value={actaNumber}
                onChange={(e) => setActaNumber(e.target.value)}
                className={inputClass}
                placeholder="01-2026"
              />
            </div>
            <div>
              <label className={labelClass}>Folios</label>
              <input
                value={folios}
                onChange={(e) => setFolios(e.target.value)}
                className={inputClass}
                placeholder="143,144,145"
              />
            </div>
            <div>
              <label className={labelClass}>Promoción *</label>
              <input
                required
                value={promocion}
                onChange={(e) => setPromocion(e.target.value)}
                className={inputClass}
                placeholder="décima"
              />
            </div>
            <div>
              <label className={labelClass}>Cohorte (año) *</label>
              <input
                required
                type="number"
                value={cohorte}
                onChange={(e) => {
                  setCohorte(e.target.value);
                  setPreviewed(false);
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha y hora del acto *</label>
              <input
                required
                type="datetime-local"
                value={actoDate}
                onChange={(e) => setActoDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha en que se extiende *</label>
              <input
                required
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-brand-800">
            Personas presentes
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Directora Técnica *</label>
              <input
                required
                value={directora}
                onChange={(e) => setDirectora(e.target.value)}
                className={inputClass}
                placeholder="Licda. ..."
              />
            </div>
            <div>
              <label className={labelClass}>Docente *</label>
              <input
                required
                value={docente}
                onChange={(e) => setDocente(e.target.value)}
                className={inputClass}
                placeholder="Licda. ..."
              />
            </div>
            <div>
              <label className={labelClass}>Secretario *</label>
              <input
                required
                value={secretario}
                onChange={(e) => setSecretario(e.target.value)}
                className={inputClass}
                placeholder="Lic. ..."
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-brand-800">
              Alumnos de la cohorte {cohorte}
            </h2>
            <button
              type="button"
              onClick={() => void previewStudents()}
              disabled={loadingPreview}
              className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
            >
              {loadingPreview ? "Cargando…" : "Cargar alumnos del año"}
            </button>
          </div>

          {!previewed ? (
            <p className="text-sm text-gray-400">
              Pulsa “Cargar alumnos del año” para traer los estudiantes
              inscritos en {cohorte}.
            </p>
          ) : students.length === 0 ? (
            <p className="text-sm text-gray-400">
              No hay estudiantes inscritos en {cohorte}.
            </p>
          ) : (
            <ol className="space-y-1 text-sm">
              {students.map((name, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5"
                >
                  <span>
                    <span className="mr-2 text-gray-400">{i + 1}.</span>
                    {name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStudent(i)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ol>
          )}
          {previewed && students.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              Total: {students.length} alumnos (puedes quitar los que no
              correspondan).
            </p>
          )}
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Generando…" : "Crear acta de inauguración"}
        </button>
      </form>
    </div>
  );
}
