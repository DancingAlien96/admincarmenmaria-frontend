"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { showAlert, showConfirm } from "@/lib/dialog";

interface Estado {
  configurado: boolean;
  conectado: boolean;
  bot: string | null;
}

// Conectar la cuenta con el bot de Telegram (avisos y recordatorios de pago).
export function TelegramConnect() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [busy, setBusy] = useState(false);
  const [esperando, setEsperando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setEstado(await api<Estado>("/api/telegram/estado"));
    } catch {
      setEstado(null);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Mientras la persona confirma en Telegram, se revisa cada 3 s si ya quedó conectada
  useEffect(() => {
    if (!esperando) return;
    const t = setInterval(() => void cargar(), 3000);
    const fin = setTimeout(() => setEsperando(false), 3 * 60_000);
    return () => {
      clearInterval(t);
      clearTimeout(fin);
    };
  }, [esperando, cargar]);

  useEffect(() => {
    if (estado?.conectado) setEsperando(false);
  }, [estado?.conectado]);

  async function conectar() {
    setBusy(true);
    try {
      const r = await api<{ url: string }>("/api/telegram/enlace", { method: "POST" });
      window.open(r.url, "_blank", "noopener");
      setEsperando(true);
    } catch (err) {
      void showAlert(err instanceof ApiError ? err.message : "No se pudo conectar con Telegram");
    } finally {
      setBusy(false);
    }
  }

  async function desconectar() {
    if (!(await showConfirm("Dejarás de recibir avisos por Telegram. ¿Desconectar?", { aceptar: "Desconectar" }))) return;
    setBusy(true);
    try {
      await api("/api/telegram", { method: "DELETE" });
      await cargar();
    } finally {
      setBusy(false);
    }
  }

  if (!estado?.configurado) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            estado.conectado ? "bg-sky-50 text-sky-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          <Send aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800">
            {estado.conectado ? "Telegram conectado" : "Recibe tus avisos por Telegram"}
          </p>
          <p className="text-sm text-gray-500">
            {estado.conectado
              ? `Te llegan tus avisos y recordatorios de pago en el chat de @${estado.bot ?? "bot"}. Escríbele /saldo para ver tus cuotas.`
              : esperando
                ? "Se abrió Telegram: toca «Iniciar» en el chat del bot para terminar de conectar…"
                : "Avisos de la escuela y recordatorios de tus cuotas directo en tu Telegram."}
          </p>
        </div>
        {estado.conectado ? (
          <button
            onClick={() => void desconectar()}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Desconectar
          </button>
        ) : (
          <button
            onClick={() => void conectar()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
          >
            <Send aria-hidden className="h-4 w-4" />
            {esperando ? "Abrir de nuevo" : "Conectar con Telegram"}
          </button>
        )}
      </div>
    </section>
  );
}
