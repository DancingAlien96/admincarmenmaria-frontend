"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { TeacherForm, type TeacherFormValues } from "@/components/teacher-form";

export default function NewTeacherPage() {
  const router = useRouter();

  async function handleSubmit(v: TeacherFormValues) {
    const { teacher } = await api<{ teacher: { id: string } }>("/api/teachers", {
      method: "POST",
      body: v,
    });
    router.replace(`/panel/catedraticos/detalle?id=${teacher.id}`);
  }

  return (
    <div>
      <Link href="/panel/catedraticos" className="text-sm text-brand-600 hover:underline">
        ← Volver a catedráticos
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">
        Nuevo catedrático
      </h1>
      <TeacherForm submitLabel="Crear catedrático" onSubmit={handleSubmit} />
    </div>
  );
}
