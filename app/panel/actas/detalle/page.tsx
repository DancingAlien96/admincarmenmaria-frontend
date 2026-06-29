"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { ActaDetail } from "@/lib/types";

function DetailInner() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = canAccess(user, "ACTAS", "EDITOR");
  const [acta, setActa] = useState<ActaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { acta } = await api<{ acta: ActaDetail }>(`/api/actas/${id}`);
      setActa(acta);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove() {
    if (!confirm("¿Eliminar esta acta?")) return;
    await api(`/api/actas/${id}`, { method: "DELETE" });
    router.replace("/panel/actas");
  }

  if (loading || !acta) return <p className="text-gray-400">Cargando…</p>;

  return (
    <div>
      <Link href="/panel/actas" className="text-sm text-brand-600 hover:underline">
        ← Volver a actas
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Acta {acta.actaNumber}
          </h1>
          <p className="text-sm text-gray-500">
            {acta.title ?? "—"} · {acta.actaDate.slice(0, 10)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${apiUrl}/api/actas/${acta.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ver PDF
          </a>
          {canEdit && (
            <>
              <Link
                href={`/panel/actas/editar?id=${acta.id}`}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Editar
              </Link>
              <button
                onClick={() => void remove()}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Folios" value={acta.folios ?? "—"} />
        <Info label="Ciudad" value={acta.city} />
        <Info label="Cierre" value={acta.closeDate ? acta.closeDate.slice(0, 10) : "—"} />
        <Info label="Alumnos" value={String(acta.rows?.length ?? 0)} />
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-brand-800">Cuerpo del acta</h2>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
          {acta.body}
        </pre>
      </section>

      {acta.signers && acta.signers.length > 0 && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-brand-800">Firmantes</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {acta.signers.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.name}</span> — {s.role}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-800">{value}</p>
    </div>
  );
}

export default function ActaDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <DetailInner />
    </Suspense>
  );
}
