"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type {
  BotConfig,
  Pagination,
  WhatsappMessage,
} from "@/lib/types";

const KIND_LABELS: Record<string, string> = {
  bot: "Bot (IA)",
  manual: "Manual",
  confirmacion_pago: "Confirmación de pago",
  recordatorio_preventivo: "Recordatorio (por vencer)",
  aviso_vencimiento: "Aviso de vencimiento",
  mora_leve: "Mora leve",
  mora_grave: "Mora grave",
  documento: "Documento",
};

export default function RemindersPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "REMINDERS", "EDITOR");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-800">Recordatorios</h1>
        <p className="text-sm text-gray-500">
          Bot de WhatsApp y registro de mensajes enviados.
        </p>
      </div>

      <div className="space-y-6">
        {canEdit && <BotConfigCard />}
        {canEdit && <BulkSendCard />}
        {canEdit && <ManualSendCard />}
        <MessageLog />
      </div>
    </div>
  );
}

function BotConfigCard() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void api<{ config: BotConfig }>("/api/whatsapp/config").then((r) =>
      setConfig(r.config)
    );
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    setNotice(null);
    try {
      await api("/api/whatsapp/config", {
        method: "PUT",
        body: {
          enabled: config.enabled,
          knowledgeBase: config.knowledgeBase,
          systemPrompt: config.systemPrompt,
        },
      });
      setNotice("Configuración guardada.");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-gray-400">Cargando configuración…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">Bot de dudas (IA)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) =>
              setConfig({ ...config, enabled: e.target.checked })
            }
          />
          {config.enabled ? "Activo" : "Inactivo"}
        </label>
      </div>

      <label className="mb-1 block text-sm font-medium text-gray-700">
        Información de la academia (la IA responde con base en esto)
      </label>
      <textarea
        rows={8}
        value={config.knowledgeBase}
        onChange={(e) =>
          setConfig({ ...config, knowledgeBase: e.target.value })
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        placeholder="Horarios, requisitos de inscripción, costos, contactos…"
      />

      <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">
        Instrucciones extra (opcional)
      </label>
      <textarea
        rows={3}
        value={config.systemPrompt ?? ""}
        onChange={(e) =>
          setConfig({ ...config, systemPrompt: e.target.value })
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        placeholder="Ej. Tono formal. No dar precios sin confirmar."
      />

      {notice && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {notice}
        </p>
      )}

      <button
        onClick={() => void save()}
        disabled={saving}
        className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar configuración"}
      </button>
    </section>
  );
}

function BulkSendCard() {
  const [templateName, setTemplateName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    if (!templateName.trim()) {
      setResult("Indica el nombre de la plantilla aprobada en YCloud.");
      return;
    }
    if (
      !confirm(
        "Se enviará la plantilla a TODOS los estudiantes activos con teléfono. ¿Continuar?"
      )
    )
      return;
    setSending(true);
    setResult(null);
    try {
      const r = await api<{ total: number; sent: number; skipped: number }>(
        "/api/whatsapp/bulk",
        { method: "POST", body: { templateName: templateName.trim() } }
      );
      setResult(`Enviados: ${r.sent} · Omitidos: ${r.skipped} · Total: ${r.total}`);
    } catch (err) {
      setResult(err instanceof ApiError ? err.message : "Error en el envío");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-brand-800">Envío masivo</h2>
      <p className="mb-4 text-xs text-gray-500">
        Envía una plantilla aprobada a todos los estudiantes activos. La
        plantilla debe usar solo {"{{1}}"} = nombre del estudiante.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Nombre de la plantilla (ej. aviso_general)"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => void send()}
          disabled={sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar a todos los activos"}
        </button>
      </div>
      {result && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {result}
        </p>
      )}
    </section>
  );
}

function ManualSendCard() {
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setNotice(null);
    try {
      await api("/api/whatsapp/send", {
        method: "POST",
        body: { phone, body },
      });
      setNotice("Mensaje enviado.");
      setBody("");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-brand-800">Envío manual</h2>
      <p className="mb-4 text-xs text-gray-500">
        Solo funciona si el contacto te escribió en las últimas 24 horas
        (regla de WhatsApp).
      </p>
      <form onSubmit={send} className="grid gap-3 sm:grid-cols-3">
        <input
          required
          placeholder="Teléfono (ej. 50212345678)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Mensaje"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </form>
      {notice && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {notice}
        </p>
      )}
    </section>
  );
}

function MessageLog() {
  const [items, setItems] = useState<WhatsappMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<"" | "INBOUND" | "OUTBOUND">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (direction) params.set("direction", direction);
      const res = await api<{ data: WhatsappMessage[]; pagination: Pagination }>(
        `/api/whatsapp/messages?${params}`
      );
      setItems(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [page, direction]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">
          Registro de mensajes ({pagination?.total ?? 0})
        </h2>
        <select
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value as "" | "INBOUND" | "OUTBOUND");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          <option value="INBOUND">Recibidos</option>
          <option value="OUTBOUND">Enviados</option>
        </select>
      </div>

      {loading ? (
        <p className="py-6 text-center text-gray-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-gray-400">
          Aún no hay mensajes registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border p-3 text-sm ${
                m.direction === "INBOUND"
                  ? "border-gray-200 bg-gray-50"
                  : "border-brand-100 bg-brand-50/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  {m.direction === "INBOUND" ? "⬅ Recibido" : "➡ Enviado"} ·{" "}
                  {m.phone}
                  {m.student && ` · ${m.student.fullName}`}
                </span>
                <span>{new Date(m.createdAt).toLocaleString("es-GT")}</span>
              </div>
              <p className="mt-1 text-gray-800">{m.body}</p>
              <div className="mt-1 flex gap-2 text-[10px]">
                {m.kind && (
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-gray-600">
                    {KIND_LABELS[m.kind] ?? m.kind}
                  </span>
                )}
                <span
                  className={`rounded px-1.5 py-0.5 ${
                    m.status === "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {m.status}
                </span>
                {m.error && <span className="text-red-600">{m.error}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
