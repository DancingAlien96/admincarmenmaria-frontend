"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ActaForm, type ActaFormValues } from "@/components/acta-form";

function toPayload(v: ActaFormValues) {
  return {
    actaNumber: v.actaNumber,
    folios: v.folios,
    title: v.title,
    actaDate: v.actaDate,
    closeDate: v.closeDate,
    city: v.city,
    department: v.department,
    body: v.body,
    notes: v.notes,
    vars: Object.fromEntries(
      v.vars.filter((x) => x.key.trim()).map((x) => [x.key.trim(), x.value])
    ),
    columns: v.body.includes("{{tabla}}") ? v.columns : v.columns.slice(0, 2),
    rows: v.rows.map((r) => ({ name: r.name, value: r.value ?? "" })),
    signers: v.signers.filter((s) => s.name.trim()),
    templateId: v.templateId,
  };
}

export default function NewActaPage() {
  const router = useRouter();

  async function handleSubmit(values: ActaFormValues) {
    const { acta } = await api<{ acta: { id: string } }>("/api/actas", {
      method: "POST",
      body: toPayload(values),
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
