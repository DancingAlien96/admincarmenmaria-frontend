"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  StudentForm,
  type StudentFormValues,
} from "@/components/student-form";

function toPayload(v: StudentFormValues) {
  return {
    fullName: v.fullName,
    dpi: v.dpi,
    birthDate: v.birthDate || null,
    enrollmentDate: v.enrollmentDate || null,
    department: v.department,
    municipality: v.municipality,
    address: v.address,
    sede: v.sede,
    phonePrimary: v.phonePrimary,
    phoneAlt: v.phoneAlt,
    email: v.email,
    guardians: v.guardians.map((g) => ({
      name: g.name,
      relationship: g.relationship ?? "",
      phone: g.phone ?? "",
      email: g.email ?? "",
    })),
  };
}

export default function NewStudentPage() {
  const router = useRouter();
  // Aspirante: aún debe pagar y aprobar el examen de admisión
  const [aspirante, setAspirante] = useState(false);

  async function handleSubmit(values: StudentFormValues) {
    const { student } = await api<{ student: { id: string } }>(
      "/api/students",
      {
        method: "POST",
        body: {
          ...toPayload(values),
          initialStatus: aspirante ? "ASPIRANTE" : "ACTIVO",
        },
      }
    );
    router.replace(`/panel/estudiantes/detalle?id=${student.id}`);
  }

  return (
    <div>
      <Link
        href="/panel/estudiantes"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver a expedientes
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">
        Nuevo expediente
      </h1>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {[
          {
            value: false,
            title: "Alumno admitido",
            desc: "Ya es parte de la academia (estado Activo).",
          },
          {
            value: true,
            title: "Aspirante",
            desc: "Debe pagar y aprobar el examen de admisión.",
          },
        ].map((o) => (
          <label
            key={String(o.value)}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm ${
              aspirante === o.value
                ? "border-brand-400 bg-brand-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              checked={aspirante === o.value}
              onChange={() => setAspirante(o.value)}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium text-gray-800">{o.title}</span>
              <span className="text-gray-500">{o.desc}</span>
            </span>
          </label>
        ))}
      </div>
      <StudentForm submitLabel="Crear expediente" onSubmit={handleSubmit} />
    </div>
  );
}
