"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, apiUrl, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { ActaDetail } from "@/lib/types";

export default function ActaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const canEdit = canAccess(user, "ACTAS", "EDITOR");
  const [acta, setActa] = useState<ActaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

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

  async function sendToSupervisor() {
    const to = prompt(
      "Correo de la supervisora (deja vacío para usar el correo configurado por defecto):"
    );
    if (to === null) return; // canceló
    setSending(true);
    setSendMsg(null);
    try {
      const body = to.trim() ? { to: to.trim() } : {};
      const res = await api<{ sentTo: string }>(`/api/actas/${id}/send`, {
        method: "POST",
        body,
      });
      setSendMsg(`Acta enviada a ${res.sentTo}.`);
      await load();
    } catch (err) {
      setSendMsg(
        err instanceof ApiError ? err.message : "No se pudo enviar el acta."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-gray-400">Cargando…</p>;
  if (!acta) return <p className="text-gray-500">Acta no encontrada.</p>;

  const avg =
    acta.entries.length > 0
      ? (
          acta.entries.reduce((s, e) => s + Number(e.score), 0) /
          acta.entries.length
        ).toFixed(2)
      : "—";

  return (
    <div>
      <Link href="/panel/actas" className="text-sm text-brand-600 hover:underline">
        ← Volver a actas
      </Link>

      <div className="mb-6 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Acta {acta.actaNumber}
          </h1>
          <p className="text-sm text-gray-500">{acta.phase}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/panel/actas/${acta.id}/editar`}
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Editar
          </Link>
          <a
            href={`${apiUrl}/api/actas/${acta.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Descargar PDF
          </a>
          {canEdit && (
            <button
              onClick={() => void sendToSupervisor()}
              disabled={sending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Enviar a supervisora"}
            </button>
          )}
        </div>
      </div>

      {/* Estado de envío */}
      {acta.sentAt ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Enviada a {acta.sentTo} el{" "}
          {new Date(acta.sentAt).toLocaleString("es-GT")}.
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta acta aún no ha sido enviada. Requiere configurar el correo emisor
          (SMTP) en el servidor.
        </div>
      )}
      {sendMsg && (
        <div className="mb-6 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {sendMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-1">
          <h2 className="mb-4 font-semibold text-brand-800">Datos del acta</h2>
          <dl className="space-y-3">
            <Field label="No. de acta" value={acta.actaNumber} />
            <Field label="No. de folios" value={acta.folios} />
            <Field label="Fase" value={acta.phase} />
            <Field label="Fecha" value={acta.actaDate.slice(0, 10)} />
            <Field label="Promedio del grupo" value={avg} />
            {acta.createdBy && (
              <Field label="Creada por" value={acta.createdBy.name} />
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-brand-800">
            Punteos ({acta.entries.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Estudiante</th>
                <th className="px-3 py-2 text-right">Punteo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {acta.entries.map((e, i) => (
                <tr key={e.id ?? i}>
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 text-gray-800">{e.studentName}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {Number(e.score).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}
