"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ActaDetail } from "@/lib/types";
import {
  ActaForm,
  type ActaFormValues,
} from "@/components/acta-form";

export default function EditActaPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [initial, setInitial] = useState<ActaFormValues | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { acta } = await api<{ acta: ActaDetail }>(`/api/actas/${id}`);
      setInitial({
        actaNumber: acta.actaNumber,
        folios: acta.folios ?? "",
        phase: acta.phase,
        actaDate: acta.actaDate.slice(0, 10),
        entries: acta.entries.map((e) => ({
          studentId: e.studentId,
          studentName: e.studentName,
          score: Number(e.score),
        })),
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: ActaFormValues) {
    await api(`/api/actas/${id}`, {
      method: "PATCH",
      body: {
        actaNumber: values.actaNumber,
        folios: values.folios,
        phase: values.phase,
        actaDate: values.actaDate,
        entries: values.entries.map((e) => ({
          studentId: e.studentId,
          studentName: e.studentName,
          score: Number(e.score),
        })),
      },
    });
    router.replace(`/panel/actas/${id}`);
  }

  if (loading || !initial) return <p className="text-gray-400">Cargando…</p>;

  return (
    <div>
      <Link
        href={`/panel/actas/${id}`}
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver al acta
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">Editar acta</h1>
      <ActaForm
        initial={initial}
        submitLabel="Guardar cambios"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
