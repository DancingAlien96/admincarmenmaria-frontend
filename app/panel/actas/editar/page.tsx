"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ActaDetail } from "@/lib/types";
import { ActaForm, type ActaFormValues } from "@/components/acta-form";

function toForm(a: ActaDetail): ActaFormValues {
  return {
    actaNumber: a.actaNumber,
    folios: a.folios ?? "",
    title: a.title ?? "",
    actaDate: a.actaDate.slice(0, 16),
    closeDate: a.closeDate ? a.closeDate.slice(0, 10) : "",
    city: a.city ?? "Chiquimula",
    department: a.department ?? "Chiquimula",
    body: a.body ?? "",
    notes: a.notes ?? "",
    vars: Object.entries(a.vars ?? {}).map(([key, value]) => ({ key, value })),
    columns:
      a.columns && a.columns.length
        ? a.columns
        : ["NO.", "NOMBRE DEL ALUMNO", "Nota Obtenida"],
    rows: (a.rows ?? []).map((r) => ({
      name: r.name,
      values: (r.values ?? (r.value != null ? [r.value] : [])).map(
        (x) => x ?? ""
      ),
    })),
    signers: a.signers && a.signers.length ? a.signers : [{ name: "", role: "" }],
    templateId: a.templateId ?? "",
  };
}

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
    columns: v.body.includes("{{tabla}}")
      ? v.columns
      : ["NO.", "NOMBRE DEL ALUMNO"],
    rows: v.rows.map((r) => {
      const noteCols = v.columns.slice(2);
      return {
        name: r.name,
        values: v.body.includes("{{tabla}}")
          ? noteCols.map((_, i) => r.values[i] ?? "")
          : [],
      };
    }),
    signers: v.signers.filter((s) => s.name.trim()),
    templateId: v.templateId,
  };
}

function EditActaInner() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const [initial, setInitial] = useState<ActaFormValues | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { acta } = await api<{ acta: ActaDetail }>(`/api/actas/${id}`);
      setInitial(toForm(acta));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: ActaFormValues) {
    await api(`/api/actas/${id}`, { method: "PATCH", body: toPayload(values) });
    router.replace(`/panel/actas/detalle?id=${id}`);
  }

  if (loading || !initial) return <p className="text-gray-400">Cargando…</p>;

  return (
    <div>
      <Link href={`/panel/actas/detalle?id=${id}`} className="text-sm text-brand-600 hover:underline">
        ← Volver al acta
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">Editar acta</h1>
      <ActaForm initial={initial} submitLabel="Guardar cambios" onSubmit={handleSubmit} />
    </div>
  );
}

export default function EditActaPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <EditActaInner />
    </Suspense>
  );
}
