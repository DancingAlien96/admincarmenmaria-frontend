"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ActaForm, type ActaFormValues } from "@/components/acta-form";

export default function NewActaPage() {
  const router = useRouter();

  async function handleSubmit(values: ActaFormValues) {
    const { acta } = await api<{ acta: { id: string } }>("/api/actas", {
      method: "POST",
      body: {
        actaNumber: values.actaNumber,
        folios: values.folios,
        phase: values.phase,
        actaDate: values.actaDate,
        closeDate: values.closeDate,
        directora: values.directora,
        secretario: values.secretario,
        entries: values.entries.map((e) => ({
          studentId: e.studentId,
          studentName: e.studentName,
          score: Number(e.score),
        })),
      },
    });
    router.replace(`/panel/actas/detalle?id=${acta.id}`);
  }

  return (
    <div>
      <Link href="/panel/actas" className="text-sm text-brand-600 hover:underline">
        ← Volver a actas
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">Nueva acta</h1>
      <ActaForm submitLabel="Crear acta" onSubmit={handleSubmit} />
    </div>
  );
}
