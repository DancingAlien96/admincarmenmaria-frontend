"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  GRADE_CATEGORY_LABELS,
  type GradeCategory,
  type StudentFases,
} from "@/lib/types";

interface DocenteStudent {
  id: string;
  fullName: string;
  expedienteNumber: string | null;
  sede: string | null;
  photoUrl: string | null;
}

const GRADE_CATS: GradeCategory[] = [
  "TAREA",
  "PRIMER_PARCIAL",
  "SEGUNDO_PARCIAL",
  "EXAMEN_FINAL",
  "RECUPERACION",
];

export default function DocenteCalificacionesPage() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<DocenteStudent[]>([]);
  const [sel, setSel] = useState<DocenteStudent | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      api<{ students: DocenteStudent[] }>(`/api/docente/students${q}`)
        .then((r) => setStudents(r.students))
        .catch(() => setStudents([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Calificaciones
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Busca al estudiante y registra sus notas por fase.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roster */}
        <div className="lg:col-span-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o expediente…"
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
            {students.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400">Sin resultados.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {students.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSel(s)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 ${
                        sel?.id === s.id ? "bg-brand-50" : ""
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs text-gray-400">
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          "👤"
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-800">
                          {s.fullName}
                        </span>
                        <span className="block truncate text-xs text-gray-400">
                          {[s.expedienteNumber, s.sede].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detalle / calificar */}
        <div className="lg:col-span-2">
          {sel ? (
            <GradeEditor student={sel} />
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
              Selecciona un estudiante para ver y registrar sus calificaciones.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GradeEditor({ student }: { student: DocenteStudent }) {
  const [data, setData] = useState<StudentFases | null>(null);
  const [fase, setFase] = useState("1");
  const [category, setCategory] = useState<GradeCategory>("TAREA");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setData(
      await api<StudentFases>(`/api/docente/students/${student.id}/fases`)
    );
  }, [student.id]);

  useEffect(() => {
    setData(null);
    void reload();
  }, [reload]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/grades", {
        method: "POST",
        body: {
          studentId: student.id,
          fase: Number(fase),
          category,
          name,
          score: Number(score),
          maxScore: Number(maxScore) || 100,
          date: date || null,
        },
      });
      setName("");
      setScore("");
      setDate("");
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(id: string) {
    try {
      await api(`/api/grades/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-brand-800">{student.fullName}</h2>
          <p className="text-xs text-gray-400">
            {[student.expedienteNumber, student.sede].filter(Boolean).join(" · ")}
          </p>
        </div>
        {data?.promedioGeneral !== null && data?.promedioGeneral !== undefined && (
          <span className="text-sm text-gray-500">
            Promedio: {data.promedioGeneral}
          </span>
        )}
      </div>

      {!data ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {data.fases.map((f) => (
            <div key={f.fase}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {f.nombre}{" "}
                  <span className="text-xs font-normal text-gray-400">
                    · {f.subtitulo}
                  </span>
                </p>
                {f.promedio !== null && (
                  <span className="text-sm text-gray-500">{f.promedio}</span>
                )}
              </div>
              {f.items.length === 0 ? (
                <p className="text-xs text-gray-400">Sin calificaciones.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {f.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-gray-700">{it.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {GRADE_CATEGORY_LABELS[it.category]}
                        </p>
                      </div>
                      <span className="font-medium text-gray-800">
                        {it.score}/{it.maxScore}
                      </span>
                      <button
                        onClick={() => void eliminar(it.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={agregar} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700">Agregar calificación</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={fase}
            onChange={(e) => setFase(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="1">Fase I</option>
            <option value="2">Fase II</option>
            <option value="3">Fase III</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as GradeCategory)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {GRADE_CATS.map((c) => (
              <option key={c} value={c}>
                {GRADE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. Ensayo, Primer parcial…)"
          required
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            step="0.01"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Nota"
            required
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="Máx."
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Guardar calificación"}
        </button>
      </form>
    </section>
  );
}
