"use client";

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

  async function handleSubmit(values: StudentFormValues) {
    const { student } = await api<{ student: { id: string } }>(
      "/api/students",
      { method: "POST", body: toPayload(values) }
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
      <StudentForm submitLabel="Crear expediente" onSubmit={handleSubmit} />
    </div>
  );
}
