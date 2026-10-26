"use client";

import { KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { usePortalMe } from "@/components/portal-context";

interface Cuenta {
  email: string;
  fullName: string;
  dpi: string | null;
  phonePrimary: string | null;
  phoneAlt: string | null;
  address: string | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

type Msg = { ok: boolean; text: string } | null;

function Aviso({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${
        msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {msg.text}
    </p>
  );
}

function Tarjeta({
  icono: Icono,
  titulo,
  descripcion,
  children,
}: {
  icono: typeof Phone;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icono aria-hidden className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold text-gray-900">{titulo}</h2>
          <p className="text-sm text-gray-500">{descripcion}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function PortalPerfilPage() {
  const { me } = usePortalMe();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ cuenta: Cuenta }>("/api/portal/cuenta")
      .then((r) => setCuenta(r.cuenta))
      .catch(() => setError("No se pudieron cargar tus datos."));
  }, []);

  if (!cuenta) {
    return <p className="text-sm text-gray-400">{error ?? "Cargando tu perfil…"}</p>;
  }

  const s = me?.student;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">Mi perfil</h1>
        <p className="text-sm text-gray-500">Tus datos personales y de acceso al Campus.</p>
      </div>

      {/* Identidad (solo lectura) */}
      <section className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-brand-700">
          {s?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photoUrl} alt={cuenta.fullName} className="h-full w-full object-cover" />
          ) : (
            <UserRound aria-hidden className="h-7 w-7" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-gray-900">{cuenta.fullName}</p>
          <p className="text-sm text-gray-500">
            {s?.expedienteNumber ? `Expediente ${s.expedienteNumber}` : "Estudiante"}
            {cuenta.dpi ? ` · DPI ${cuenta.dpi}` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Para corregir tu nombre o DPI comunícate con la administración.
          </p>
        </div>
      </section>

      <ContactoForm cuenta={cuenta} onSaved={setCuenta} />
      <CorreoForm cuenta={cuenta} />
      <PasswordForm />
    </div>
  );
}

function ContactoForm({ cuenta, onSaved }: { cuenta: Cuenta; onSaved: (c: Cuenta) => void }) {
  const [phonePrimary, setPhonePrimary] = useState(cuenta.phonePrimary ?? "");
  const [phoneAlt, setPhoneAlt] = useState(cuenta.phoneAlt ?? "");
  const [address, setAddress] = useState(cuenta.address ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ cuenta: Cuenta }>("/api/portal/cuenta/contacto", {
        method: "PUT",
        body: { phonePrimary, phoneAlt, address },
      });
      onSaved(r.cuenta);
      setMsg({ ok: true, text: "Datos guardados." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tarjeta icono={Phone} titulo="Datos de contacto" descripcion="Para que la escuela pueda comunicarse contigo.">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Teléfono *</label>
            <input
              value={phonePrimary}
              onChange={(e) => setPhonePrimary(e.target.value)}
              inputMode="tel"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono alternativo</label>
            <input
              value={phoneAlt}
              onChange={(e) => setPhoneAlt(e.target.value)}
              inputMode="tel"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </div>
        </div>
        <Aviso msg={msg} />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </Tarjeta>
  );
}

function CorreoForm({ cuenta }: { cuenta: Cuenta }) {
  const [email, setEmail] = useState(cuenta.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const cambio = email.trim().toLowerCase() !== cuenta.email.toLowerCase();

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ pendiente: string }>("/api/portal/cuenta/correo", {
        method: "PUT",
        body: { email: email.trim(), password },
      });
      setPassword("");
      setMsg({
        ok: true,
        text: `Te enviamos un enlace a ${r.pendiente}. Ábrelo para confirmar el cambio (vence en 24 horas). Mientras tanto sigues entrando con ${cuenta.email}.`,
      });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo cambiar el correo" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tarjeta
      icono={Mail}
      titulo="Correo electrónico"
      descripcion="Es tu usuario para entrar al Campus y donde te llegan los avisos."
    >
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          {cambio && (
            <div>
              <label className={labelClass}>Tu contraseña actual *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </div>
          )}
        </div>
        <Aviso msg={msg} />
        <button
          type="submit"
          disabled={busy || !cambio}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Cambiar correo"}
        </button>
      </form>
    </Tarjeta>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "La nueva contraseña y su confirmación no coinciden" });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ ok: false, text: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }
    setBusy(true);
    try {
      await api("/api/portal/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setMsg({ ok: true, text: "Contraseña actualizada." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tarjeta icono={KeyRound} titulo="Contraseña" descripcion="La contraseña inicial es tu DPI; te recomendamos cambiarla.">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirmar</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>
        <Aviso msg={msg} />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </Tarjeta>
  );
}
