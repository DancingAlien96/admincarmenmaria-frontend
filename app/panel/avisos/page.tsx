"use client";

import { BellRing, Mail, Megaphone, MonitorSmartphone, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/labels";
import type { AvisoEnviado } from "@/lib/types";

type Audience = "students" | "teachers" | "custom";

interface Picked {
  id: string;
  kind: "student" | "teacher";
  name: string;
}

interface Opciones {
  years: number[];
  sedes: string[];
  pushConfigurado: boolean;
}

// Páginas del portal a las que puede llevar el aviso al tocarlo.
const ENLACES: [string, string][] = [
  ["", "Sin enlace (abre el Campus)"],
  ["/portal/notificaciones/", "Notificaciones"],
  ["/portal/pagos/", "Pagos"],
  ["/portal/fases/", "Fases"],
  ["/portal/documentos/", "Documentación"],
  ["/portal/matricula/", "Matrícula"],
  ["/portal/ebooks/", "E-Books / Material de estudio"],
  ["otro", "Otra dirección web (https)…"],
];

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

function fmtFecha(iso: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guatemala",
  }).format(new Date(iso));
}

export default function AvisosPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "REMINDERS", "EDITOR");
  const [opciones, setOpciones] = useState<Opciones | null>(null);
  const [avisos, setAvisos] = useState<AvisoEnviado[] | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ avisos: AvisoEnviado[] }>("/api/avisos");
    setAvisos(r.avisos);
  }, []);

  useEffect(() => {
    api<Opciones>("/api/avisos/opciones").then(setOpciones).catch(() => undefined);
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Avisos y notificaciones</h1>
        <p className="text-sm text-gray-500">
          Envía un aviso a estudiantes o catedráticos. Les llega como notificación al
          celular y queda guardado en su portal.
        </p>
      </div>

      {opciones && !opciones.pushConfigurado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Las notificaciones push aún no están activadas en el servidor. Los avisos se
          guardan en el portal (y se envían por correo si lo marcas).
        </p>
      )}

      {canEdit && opciones && <NuevoAviso opciones={opciones} onSent={load} />}

      <Historial avisos={avisos} canEdit={canEdit} onChange={load} />
    </div>
  );
}

function NuevoAviso({ opciones, onSent }: { opciones: Opciones; onSent: () => Promise<void> }) {
  const [audience, setAudience] = useState<Audience>("students");
  const [year, setYear] = useState("");
  const [sede, setSede] = useState("");
  const [aspirantes, setAspirantes] = useState(false);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Picked[]>([]);
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enlace, setEnlace] = useState("");
  const [enlaceOtro, setEnlaceOtro] = useState("");
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Buscador de personas específicas (alumnos y catedráticos)
  useEffect(() => {
    if (audience !== "custom" || search.trim().length < 2) return;
    const t = setTimeout(() => {
      api<{
        students: { id: string; fullName: string }[];
        teachers: { id: string; fullName: string }[];
      }>(`/api/whatsapp/email-recipients?search=${encodeURIComponent(search.trim())}`)
        .then((r) =>
          setResults([
            ...r.students.map((s) => ({ id: s.id, kind: "student" as const, name: s.fullName })),
            ...r.teachers.map((t) => ({ id: t.id, kind: "teacher" as const, name: t.fullName })),
          ])
        )
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search, audience]);

  const shownResults = audience === "custom" && search.trim().length >= 2 ? results : [];
  const url = enlace === "otro" ? enlaceOtro.trim() : enlace;
  const sinDestino = audience === "custom" && picked.length === 0;
  const enlaceInvalido = enlace === "otro" && !/^https:\/\/\S+$/i.test(enlaceOtro.trim());

  function destinoTexto() {
    if (audience === "teachers") return "a todos los catedráticos";
    if (audience === "custom") return `a ${picked.length} persona(s) seleccionada(s)`;
    const partes = [aspirantes ? "a los estudiantes activos y aspirantes" : "a los estudiantes activos"];
    if (year) partes.push(`de la promoción ${year}`);
    if (sede) partes.push(`de la sede ${sede}`);
    return partes.join(" ");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Se enviará el aviso ${destinoTexto()}. ¿Continuar?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{
        destinatarios: number;
        conPush: number;
        correos: number;
        pushConfigurado: boolean;
      }>("/api/avisos", {
        method: "POST",
        body: {
          titulo,
          mensaje,
          url: url || null,
          audience,
          year: audience === "students" && year ? Number(year) : undefined,
          sede: audience === "students" && sede ? sede : undefined,
          incluirAspirantes: audience === "students" ? aspirantes : undefined,
          studentIds: picked.filter((p) => p.kind === "student").map((p) => p.id),
          teacherIds: picked.filter((p) => p.kind === "teacher").map((p) => p.id),
          push,
          email,
        },
      });
      const partes = [`Aviso guardado en el portal de ${r.destinatarios} persona(s).`];
      if (push && r.pushConfigurado) {
        partes.push(`${r.conPush} tienen las notificaciones activadas y lo recibirán en su dispositivo.`);
      }
      if (email) partes.push(`Enviando ${r.correos} correo(s).`);
      setMsg({ ok: true, text: partes.join(" ") });
      setTitulo("");
      setMensaje("");
      setEnlace("");
      setEnlaceOtro("");
      setPicked([]);
      await onSent();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo enviar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-brand-800">
        <Megaphone aria-hidden className="h-5 w-5" />
        Nuevo aviso
      </h2>
      <form onSubmit={enviar} className="grid gap-5 lg:grid-cols-[1fr_18rem]">
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
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todas las promociones</option>
                {opciones.years.map((y) => (
                  <option key={y} value={y}>
                    Promoción {y}
                  </option>
                ))}
              </select>
              <select
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todas las sedes</option>
                {opciones.sedes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={aspirantes}
                  onChange={(e) => setAspirantes(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Incluir aspirantes
              </label>
            </div>
          )}

          {audience === "custom" && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar estudiante o catedrático por nombre…"
                  className={inputClass}
                />
                {shownResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {shownResults.map((r) => {
                      const ya = picked.some((p) => p.id === r.id && p.kind === r.kind);
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
                            <span className="min-w-0 truncate">{r.name}</span>
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
                          setPicked(picked.filter((x) => !(x.id === p.id && x.kind === p.kind)))
                        }
                        className="text-gray-400 hover:text-red-600"
                        aria-label={`Quitar a ${p.name}`}
                      >
                        <X aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título (ej. Examen de admisión)"
            maxLength={120}
            required
            className={inputClass}
          />
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe el aviso…"
            rows={4}
            maxLength={2000}
            required
            className={inputClass}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm text-gray-700">
              Al tocarlo, abrir:
              <select
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                className={`${inputClass} mt-1`}
              >
                {ENLACES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {enlace === "otro" && (
              <label className="text-sm text-gray-700">
                Dirección web
                <input
                  value={enlaceOtro}
                  onChange={(e) => setEnlaceOtro(e.target.value)}
                  placeholder="https://…"
                  className={`${inputClass} mt-1`}
                />
              </label>
            )}
          </div>

          {/* Canales */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
            <p className="flex items-center gap-2 text-gray-500">
              <MonitorSmartphone aria-hidden className="h-4 w-4" />
              Siempre queda guardado en las Notificaciones del portal.
            </p>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={push}
                onChange={(e) => setPush(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <BellRing aria-hidden className="h-4 w-4 text-brand-600" />
              Notificación al celular (a quienes las activaron)
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={email}
                onChange={(e) => setEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Mail aria-hidden className="h-4 w-4 text-brand-600" />
              También por correo
            </label>
          </div>

          <button
            type="submit"
            disabled={busy || sinDestino || enlaceInvalido || !titulo.trim() || !mensaje.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Enviar aviso"}
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

        {/* Vista previa de la notificación */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-gray-400">Así se verá</p>
          <div className="flex gap-3 rounded-2xl bg-gray-100 p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">Campus Carmen María · ahora</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {titulo.trim() || "Título del aviso"}
              </p>
              <p className="line-clamp-3 text-sm text-gray-700">
                {mensaje.trim() || "El mensaje aparecerá aquí."}
              </p>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function Historial({
  avisos,
  canEdit,
  onChange,
}: {
  avisos: AvisoEnviado[] | null;
  canEdit: boolean;
  onChange: () => Promise<void>;
}) {
  async function eliminar(a: AvisoEnviado) {
    if (!confirm(`¿Eliminar "${a.titulo}"? Dejará de verse en el portal de los destinatarios.`)) return;
    await api(`/api/avisos/${a.id}`, { method: "DELETE" });
    await onChange();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-brand-800">Avisos enviados</h2>
      {!avisos ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : avisos.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no se ha enviado ningún aviso.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {avisos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800">{a.titulo}</p>
                <p className="line-clamp-2 text-sm text-gray-600">{a.mensaje}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {fmtFecha(a.createdAt)}
                  {a.destino ? ` · ${a.destino}` : ""}
                  {a.creadoPor ? ` · por ${a.creadoPor}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  Leído por {a.leidos} de {a.destinatarios}
                </span>
                {a.canales.includes("push") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                    <BellRing aria-hidden className="h-3 w-3" />
                    {a.pushEnviados} al celular
                  </span>
                )}
                {a.canales.includes("correo") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                    <Mail aria-hidden className="h-3 w-3" />
                    {a.correosEnviados} correos
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => void eliminar(a)}
                    aria-label={`Eliminar ${a.titulo}`}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
