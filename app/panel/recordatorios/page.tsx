"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import { uploadFile, type UploadedFile } from "@/lib/upload";
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

function EmailTestCard() {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function enviar() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/whatsapp/test-email", { method: "POST", body: { to } });
      setMsg({ ok: true, text: `Correo de prueba enviado a ${to}. Revisa la bandeja (y spam).` });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : "No se pudo enviar el correo.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-brand-800">Correo electrónico</h2>
      <p className="mb-4 text-sm text-gray-500">
        Envía un correo de prueba para verificar que el sistema puede mandar
        correos (bienvenida al Campus, avisos, etc.).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-gray-600">
            Correo de destino
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => void enviar()}
          disabled={busy || !to}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Enviar prueba"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.ok
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

type Audience = "students" | "teachers" | "custom";

interface PickedPerson {
  id: string;
  kind: "student" | "teacher";
  name: string;
  email: string;
}

const MAX_FILES = 5;
const MAX_TOTAL_MB = 15;

function BulkEmailCard() {
  const nowY = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => nowY + 1 - i);
  const [audience, setAudience] = useState<Audience>("students");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [year, setYear] = useState("");
  // Personas específicas
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PickedPerson[]>([]);
  const [picked, setPicked] = useState<PickedPerson[]>([]);
  const [extraEmails, setExtraEmails] = useState("");
  // Adjuntos (ya subidos al servidor)
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Búsqueda de alumnos y catedráticos con correo
  useEffect(() => {
    if (audience !== "custom" || search.trim().length < 2) return;
    const t = setTimeout(() => {
      api<{
        students: { id: string; fullName: string; email: string }[];
        teachers: { id: string; fullName: string; email: string }[];
      }>(`/api/whatsapp/email-recipients?search=${encodeURIComponent(search.trim())}`)
        .then((r) =>
          setResults([
            ...r.students.map((s) => ({
              id: s.id,
              kind: "student" as const,
              name: s.fullName,
              email: s.email,
            })),
            ...r.teachers.map((t) => ({
              id: t.id,
              kind: "teacher" as const,
              name: t.fullName,
              email: t.email,
            })),
          ])
        )
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search, audience]);

  // Solo se muestran resultados mientras hay una búsqueda válida
  const shownResults =
    audience === "custom" && search.trim().length >= 2 ? results : [];
  const emailList = extraEmails
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    if (files.length + incoming.length > MAX_FILES) {
      alert(`Máximo ${MAX_FILES} archivos adjuntos.`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const f of incoming) uploaded.push(await uploadFile(f));
      const next = [...files, ...uploaded];
      if (next.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_MB * 1024 * 1024) {
        alert(`Los adjuntos no pueden pasar de ${MAX_TOTAL_MB} MB en total.`);
        return;
      }
      setFiles(next);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  function destinoTexto() {
    if (audience === "teachers") return "a todos los catedráticos con correo";
    if (audience === "custom") {
      const n = picked.length + emailList.length;
      return `a ${n} persona(s) seleccionada(s)`;
    }
    return year
      ? `a todos los estudiantes activos de la promoción ${year}`
      : "a TODOS los estudiantes activos con correo";
  }

  async function enviar() {
    if (!confirm(`Se enviará el correo ${destinoTexto()}. ¿Continuar?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ queued: number }>("/api/whatsapp/bulk-email", {
        method: "POST",
        body: {
          subject,
          message,
          audience,
          year: audience === "students" && year ? Number(year) : undefined,
          studentIds: picked.filter((p) => p.kind === "student").map((p) => p.id),
          teacherIds: picked.filter((p) => p.kind === "teacher").map((p) => p.id),
          emails: emailList,
          attachments: files.map((f) => ({ key: f.key, name: f.name })),
        },
      });
      setMsg({
        ok: true,
        text: `Enviando a ${r.queued} destinatario(s). Puede tardar unos minutos; puedes seguir trabajando.`,
      });
      setSubject("");
      setMessage("");
      setFiles([]);
      setPicked([]);
      setExtraEmails("");
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : "No se pudo enviar.",
      });
    } finally {
      setBusy(false);
    }
  }

  const sinDestino =
    audience === "custom" && picked.length === 0 && emailList.length === 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-brand-800">Correo masivo</h2>
      <p className="mb-4 text-sm text-gray-500">
        Envía un aviso por correo a estudiantes, catedráticos o personas
        específicas, con documentos o fotos adjuntos.
      </p>
      <div className="space-y-3">
        {/* Destinatarios */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["students", "Estudiantes"],
              ["teachers", "Catedráticos"],
              ["custom", "Personas específicas"],
            ] as [Audience, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAudience(value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                audience === value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {audience === "students" && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los activos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Promoción {y}
              </option>
            ))}
          </select>
        )}

        {audience === "custom" && (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar estudiante o catedrático por nombre…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {shownResults.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {shownResults.map((r) => {
                    const ya = picked.some(
                      (p) => p.id === r.id && p.kind === r.kind
                    );
                    return (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          type="button"
                          disabled={ya}
                          onClick={() => {
                            setPicked([...picked, r]);
                            setSearch("");
                            setResults([]);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:opacity-40"
                        >
                          <span className="min-w-0 truncate">
                            {r.name}
                            <span className="ml-1 text-xs text-gray-400">
                              {r.email}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-gray-500">
                            {r.kind === "student" ? "Estudiante" : "Catedrático"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {picked.map((p) => (
                  <span
                    key={`${p.kind}-${p.id}`}
                    className="flex max-w-[16rem] items-center gap-1 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs text-brand-800"
                  >
                    <span className="truncate">{p.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPicked(
                          picked.filter(
                            (x) => !(x.id === p.id && x.kind === p.kind)
                          )
                        )
                      }
                      className="text-gray-400 hover:text-red-600"
                      aria-label={`Quitar a ${p.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              placeholder="Otros correos (opcional), separados por coma"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe el mensaje…"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        {/* Adjuntos */}
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <input
              type="file"
              multiple
              accept="application/pdf,image/*"
              className="hidden"
              disabled={uploading || files.length >= MAX_FILES}
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {uploading ? "Subiendo…" : "📎 Adjuntar documentos o fotos"}
          </label>
          <span className="ml-2 text-xs text-gray-400">
            PDF o imágenes · máx. {MAX_FILES} archivos, {MAX_TOTAL_MB} MB
          </span>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f) => (
                <li
                  key={f.key}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate text-gray-700">{f.name}</span>
                  <span className="flex shrink-0 items-center gap-3 text-gray-400">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((x) => x.key !== f.key))}
                      className="text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </span>
                </li>
              ))}
              <li className="text-right text-[11px] text-gray-400">
                Total {(totalBytes / 1024 / 1024).toFixed(1)} MB
              </li>
            </ul>
          )}
        </div>

        <button
          onClick={() => void enviar()}
          disabled={
            busy || uploading || sinDestino || !subject.trim() || !message.trim()
          }
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Enviar correo"}
        </button>
        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}

function EmailRemindersCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function correr() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ checked: number; sent: number; skipped: number }>(
        "/api/whatsapp/run-email-reminders",
        { method: "POST" }
      );
      setMsg({
        ok: true,
        text: `Listo: ${r.sent} recordatorio(s) enviados (${r.checked} cuotas revisadas).`,
      });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : "No se pudo ejecutar.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-brand-800">
        Recordatorios de cuotas por correo
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        El sistema envía solo, cada día, un correo a los estudiantes con cuota{" "}
        <strong>por vencer</strong> (5 días antes y el día) o{" "}
        <strong>en mora</strong> (3 y 7 días después). Aquí puedes ejecutarlo
        manualmente ahora.
      </p>
      <button
        onClick={() => void correr()}
        disabled={busy}
        className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        {busy ? "Enviando…" : "Enviar recordatorios ahora"}
      </button>
      {msg && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

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
        {canEdit && <EmailTestCard />}
        {canEdit && <BulkEmailCard />}
        {canEdit && <EmailRemindersCard />}
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
