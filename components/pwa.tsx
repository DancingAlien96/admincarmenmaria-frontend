"use client";

import { Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

// Evento de Chrome/Android para ofrecer la instalación de la app.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cm-install-dismissed";
const DISMISS_DAYS = 30;

function wasDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    return !!v && Date.now() - Number(v) < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

// En el servidor no hay navegador: no se muestra nada.
const noop = () => () => {};
function useClientValue<T>(get: () => T, server: T): T {
  return useSyncExternalStore(noop, get, () => server);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  // En iOS solo Safari permite "Agregar a inicio"
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

// Registra el service worker (solo en producción) y ofrece instalar la app
// en celulares.
export function PwaSupport() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);

  const isMobile = useClientValue(
    () => window.matchMedia("(max-width: 767px)").matches,
    false
  );
  const standalone = useClientValue(isStandalone, true);
  const ios = useClientValue(isIosSafari, false);
  const dismissed = useClientValue(wasDismissed, true);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function cerrar() {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento: solo se oculta en esta visita */
    }
  }

  async function instalar() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    setPromptEvent(null);
    setClosed(true);
  }

  const show =
    isMobile && !standalone && !dismissed && !closed && (!!promptEvent || ios);
  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl border border-gray-100"
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-brand-800">
            Instala la app del Campus
          </p>
          {promptEvent ? (
            <p className="text-gray-500">
              Ábrela desde tu pantalla de inicio, como cualquier app.
            </p>
          ) : (
            <p className="text-gray-500">
              En Safari toca <b>Compartir</b> (<Share aria-hidden className="inline h-3.5 w-3.5 align-[-2px]" />) y
              luego <b>“Agregar a inicio”</b>.
            </p>
          )}
        </div>
        <button
          onClick={cerrar}
          className="shrink-0 px-1 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      {promptEvent && (
        <button
          onClick={() => void instalar()}
          className="mt-3 w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Instalar
        </button>
      )}
    </div>
  );
}
