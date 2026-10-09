// Notificaciones push en el navegador/celular (PWA).
import { api } from "./api";

export type PushEstado =
  | "no-soportado" // navegador sin push
  | "ios-instalar" // iPhone/iPad: solo funciona con la app agregada a inicio
  | "bloqueado" // el usuario negó el permiso
  | "apagado"
  | "activo";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function soportado(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registro(): Promise<ServiceWorkerRegistration> {
  const actual = await navigator.serviceWorker.getRegistration("/");
  if (!actual) {
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  }
  return navigator.serviceWorker.ready;
}

export async function estadoPush(): Promise<PushEstado> {
  if (!soportado()) return isIos() && !isStandalone() ? "ios-instalar" : "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "activo" : "apagado";
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Pide permiso, suscribe este dispositivo y lo registra en el servidor.
export async function activarPush(): Promise<PushEstado> {
  const cfg = await api<{ enabled: boolean; publicKey: string | null }>("/api/push/config");
  if (!cfg.enabled || !cfg.publicKey) {
    throw new Error("Las notificaciones aún no están habilitadas en el servidor.");
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "bloqueado" : "apagado";

  const reg = await registro();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(cfg.publicKey),
    });
  }
  await api("/api/push/subscribe", { method: "POST", body: sub.toJSON() });
  return "activo";
}

export async function desactivarPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/api/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(
    () => undefined
  );
  await sub.unsubscribe();
}

export function probarPush() {
  return api<{ ok: boolean }>("/api/push/test", { method: "POST" });
}

// Al cerrar sesión: este dispositivo deja de recibir avisos de esa cuenta.
export async function olvidarDispositivo(): Promise<void> {
  try {
    if (!soportado()) return;
    await desactivarPush();
  } catch {
    /* sin conexión: el servidor la limpiará cuando falle el envío */
  }
}
