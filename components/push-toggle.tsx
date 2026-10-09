"use client";

import { BellOff, BellRing, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ApiError } from "@/lib/api";
import {
  activarPush,
  desactivarPush,
  estadoPush,
  probarPush,
  type PushEstado,
} from "@/lib/push";

const DISMISS_KEY = "cm-push-banner-dismissed";

function bannerOculto(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    return !!v && Date.now() - Number(v) < 14 * 86400000;
  } catch {
    return false;
  }
}

const noop = () => () => {};

function usePushEstado() {
  const [estado, setEstado] = useState<PushEstado | null>(null);
  useEffect(() => {
    estadoPush().then(setEstado).catch(() => setEstado("no-soportado"));
  }, []);
  return [estado, setEstado] as const;
}

// Tarjeta para activar/desactivar las notificaciones en este dispositivo.
export function PushToggle() {
  const [estado, setEstado] = usePushEstado();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function activar() {
    setBusy(true);
    setMsg(null);
    try {
      const e = await activarPush();
      setEstado(e);
      if (e === "activo") {
        const r = await probarPush();
        setMsg(r.ok ? "Listo. Te enviamos una notificación de prueba." : null);
      }
    } catch (err) {
      setMsg(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "No se pudieron activar las notificaciones."
      );
    } finally {
      setBusy(false);
    }
  }

  async function desactivar() {
    setBusy(true);
    setMsg(null);
    try {
      await desactivarPush();
      setEstado("apagado");
    } finally {
      setBusy(false);
    }
  }

  if (!estado || estado === "no-soportado") return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            estado === "activo" ? "bg-green-50 text-green-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          {estado === "activo" ? (
            <BellRing aria-hidden className="h-5 w-5" />
          ) : (
            <BellOff aria-hidden className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800">
            {estado === "activo"
              ? "Notificaciones activadas en este dispositivo"
              : "Notificaciones en este dispositivo"}
          </p>
          <p className="text-sm text-gray-500">
            {estado === "activo" &&
              "Te avisaremos de pagos, documentos, calificaciones y avisos de la escuela."}
            {estado === "apagado" &&
              "Recibe un aviso en tu celular o computadora aunque no tengas el Campus abierto."}
            {estado === "bloqueado" &&
              "Las bloqueaste en este navegador. Para activarlas, permite las notificaciones de este sitio en la configuración del navegador."}
            {estado === "ios-instalar" && (
              <>
                En iPhone primero instala la app: toca{" "}
                <Share aria-hidden className="inline h-4 w-4 align-[-3px]" /> Compartir y luego{" "}
                <strong>Agregar a inicio</strong>. Abre el Campus desde ese ícono y activa aquí las
                notificaciones.
              </>
            )}
          </p>
        </div>
        {estado === "apagado" && (
          <button
            onClick={() => void activar()}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Activando…" : "Activar"}
          </button>
        )}
        {estado === "activo" && (
          <button
            onClick={() => void desactivar()}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Desactivar
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-brand-700">{msg}</p>}
    </section>
  );
}

// Aviso discreto en la página de inicio para invitar a activarlas.
export function PushBanner({ href }: { href: string }) {
  const [estado] = usePushEstado();
  // Leído del navegador (en el servidor se considera oculto)
  const guardado = useSyncExternalStore(noop, bannerOculto, () => true);
  const [cerrado, setCerrado] = useState(false);

  if (guardado || cerrado || estado !== "apagado") return null;

  function cerrar() {
    setCerrado(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento: solo se oculta en esta visita */
    }
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
      <BellRing aria-hidden className="h-5 w-5 shrink-0 text-brand-600" />
      <p className="min-w-0 flex-1 text-sm text-brand-800">
        Activa las notificaciones para enterarte al instante de pagos, calificaciones y avisos.{" "}
        <a href={href} className="font-medium underline">
          Activar
        </a>
      </p>
      <button onClick={cerrar} aria-label="Cerrar" className="text-brand-400 hover:text-brand-700">
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
