"use client";

import { Bot, RotateCcw, SendHorizontal, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalMe } from "@/components/portal-context";

interface Mensaje {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Estado {
  disponible: boolean;
  restantes: number;
  limite: number;
  mensajes: Mensaje[];
}

const SUGERENCIAS_ALUMNO = [
  "¿Cuánto debo y cuándo vence mi próxima cuota?",
  "¿Cómo voy en mis fases?",
  "¿Qué documentos me faltan?",
  "¿Cómo subo mi matrícula?",
];

const SUGERENCIAS_ASPIRANTE = [
  "¿Cómo pago el examen de admisión?",
  "¿Dónde está el material de estudio?",
  "¿Qué documentos me faltan?",
  "¿Cuáles son los siguientes pasos de mi inscripción?",
];

export default function AsistentePage() {
  const { me } = usePortalMe();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Estado>("/api/asistente")
      .then(setEstado)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el asistente"));
  }, []);

  // Siempre mostrar el último mensaje
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [estado?.mensajes.length, enviando]);

  async function enviar(pregunta: string) {
    const q = pregunta.trim();
    if (!q || enviando || !estado) return;
    setEnviando(q);
    setTexto("");
    setError(null);
    try {
      const r = await api<{ pregunta: Mensaje; respuesta: Mensaje; restantes: number }>(
        "/api/asistente/preguntar",
        { method: "POST", body: { pregunta: q } }
      );
      setEstado((e) =>
        e ? { ...e, restantes: r.restantes, mensajes: [...e.mensajes, r.pregunta, r.respuesta] } : e
      );
    } catch (err) {
      setTexto(q);
      setError(err instanceof ApiError ? err.message : "No se pudo enviar tu pregunta");
    } finally {
      setEnviando(null);
    }
  }

  async function nueva() {
    await api("/api/asistente/nueva", { method: "POST" }).catch(() => undefined);
    setEstado((e) => (e ? { ...e, mensajes: [] } : e));
    setError(null);
  }

  const aspirante = me?.student.status === "ASPIRANTE" || me?.student.status === "NO_ADMITIDO";
  const sugerencias = aspirante ? SUGERENCIAS_ASPIRANTE : SUGERENCIAS_ALUMNO;
  const sinPreguntas = estado ? estado.restantes <= 0 : false;

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[28rem] flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">Asistente virtual</h1>
          <p className="text-sm text-gray-500">
            Pregúntale sobre tus pagos, fases, documentos, matrícula o cómo usar el Campus.
          </p>
        </div>
        {estado && estado.mensajes.length > 0 && (
          <button
            onClick={() => void nueva()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Nueva conversación
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {!estado ? (
            <p className="text-sm text-gray-400">{error ?? "Cargando…"}</p>
          ) : !estado.disponible ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              El asistente no está disponible en este momento. Para dudas, comunícate con la
              administración de la escuela.
            </p>
          ) : (
            <>
              <Burbuja role="assistant">
                ¡Hola{me ? `, ${me.student.fullName.split(" ")[0]}` : ""}! Soy el asistente del Campus
                Carmen María. ¿En qué te ayudo?
              </Burbuja>
              {estado.mensajes.length === 0 && (
                <div className="flex flex-wrap gap-2 pl-10">
                  {sugerencias.map((s) => (
                    <button
                      key={s}
                      onClick={() => void enviar(s)}
                      disabled={sinPreguntas || !!enviando}
                      className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-sm text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {estado.mensajes.map((m) => (
                <Burbuja key={m.id} role={m.role}>
                  {m.content}
                </Burbuja>
              ))}
              {enviando && (
                <>
                  <Burbuja role="user">{enviando}</Burbuja>
                  <Burbuja role="assistant">
                    <span className="inline-flex gap-1" aria-label="Escribiendo">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </span>
                  </Burbuja>
                </>
              )}
            </>
          )}
          <div ref={finRef} />
        </div>

        {estado?.disponible && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(texto);
            }}
            className="border-t border-gray-200 p-3"
          >
            {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviar(texto);
                  }
                }}
                rows={1}
                maxLength={600}
                disabled={sinPreguntas}
                placeholder={sinPreguntas ? "Llegaste al límite de preguntas de hoy" : "Escribe tu pregunta…"}
                className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!texto.trim() || !!enviando || sinPreguntas}
                aria-label="Enviar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <SendHorizontal aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              Te quedan {estado.restantes} de {estado.limite} preguntas por hoy. Las respuestas las
              genera una IA y pueden tener errores; para trámites confirma con la administración.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Burbuja({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const yo = role === "user";
  return (
    <div className={`flex items-start gap-2 ${yo ? "flex-row-reverse" : ""}`}>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          yo ? "bg-gray-100 text-gray-500" : "bg-brand-100 text-brand-700"
        }`}
      >
        {yo ? <User aria-hidden className="h-4 w-4" /> : <Bot aria-hidden className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          yo ? "rounded-tr-sm bg-brand-600 text-white" : "rounded-tl-sm bg-gray-100 text-gray-800"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
