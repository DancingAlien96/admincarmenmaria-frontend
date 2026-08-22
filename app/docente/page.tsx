"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DocenteInicioPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ totalStudents: number; fases: number } | null>(
    null
  );

  useEffect(() => {
    api<{ totalStudents: number; fases: number }>("/api/docente/summary")
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">
          Bienvenido/a, {firstName}
        </h1>
        <p className="text-sm text-gray-500">
          Portal del Docente · Escuela de Enfermería Carmen María
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500">Estudiantes activos</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">
            {summary?.totalStudents ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500">Fases</p>
          <p className="mt-1 text-2xl font-bold text-brand-800">
            {summary?.fases ?? 3}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">I · II · III</p>
        </div>
        <Link
          href="/docente/calificaciones"
          className="flex flex-col justify-center rounded-xl border border-brand-200 bg-brand-50 p-5 hover:bg-brand-100"
        >
          <p className="font-semibold text-brand-800">Ingresar calificaciones →</p>
          <p className="text-xs text-brand-700/80">
            Busca a un estudiante y registra sus notas por fase.
          </p>
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-brand-800">Cómo calificar</h2>
        <ol className="ml-5 list-decimal space-y-1 text-sm text-gray-600">
          <li>Entra a <strong>Calificaciones</strong>.</li>
          <li>Busca al estudiante por nombre o expediente.</li>
          <li>Agrega la nota (tarea, parcial, examen final…) en la fase que corresponda.</li>
          <li>El estudiante verá su nota y promedio en su portal, en la sección Fases.</li>
        </ol>
      </section>
    </div>
  );
}
