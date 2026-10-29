"use client";

import { Building2, KeyRound, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Perfil {
  email: string;
  fullName: string;
  dpi: string | null;
  phone: string | null;
  address: string | null;
  title: string | null;
  collegiate: string | null;
  specialty: string | null;
  bankName: string | null;
  bankAccountType: "MONETARIA" | "AHORRO" | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

// Bancos más comunes en Guatemala (se puede escribir otro)
const BANCOS = [
  "Banco Industrial",
  "Banrural",
  "BAM",
  "G&T Continental",
  "Banco de los Trabajadores (Bantrab)",
  "Banco Promerica",
  "Banco Inmobiliario",
  "Interbanco",
  "BAC Credomatic",
  "Banco Ficohsa",
  "Vivibanco",
  "Banco Azteca",
  "Banco Internacional",
  "Crédito Hipotecario Nacional (CHN)",
];

type Msg = { ok: boolean; text: string } | null;

function Aviso({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
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
  icono: typeof UserRound;
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

function Guardar({ busy, texto = "Guardar" }: { busy: boolean; texto?: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {busy ? "Guardando…" : texto}
    </button>
  );
}

export default function DocentePerfilPage() {
  const { user, refresh } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ perfil: Perfil }>("/api/docente/perfil")
      .then((r) => setPerfil(r.perfil))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar tu perfil."));
  }, []);

  if (user?.role !== "DOCENTE") {
    return <p className="text-sm text-gray-500">El perfil es solo para cuentas de docente.</p>;
  }
  if (!perfil) return <p className="text-sm text-gray-400">{error ?? "Cargando tu perfil…"}</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">Mi perfil</h1>
        <p className="text-sm text-gray-500">
          Tus datos personales y la cuenta bancaria donde la escuela te deposita. Usuario: {perfil.email}
        </p>
      </div>
      <DatosForm
        perfil={perfil}
        onSaved={async (p) => {
          setPerfil(p);
          await refresh();
        }}
      />
      <BancoForm perfil={perfil} onSaved={setPerfil} />
      <PasswordForm />
    </div>
  );
}

function DatosForm({ perfil, onSaved }: { perfil: Perfil; onSaved: (p: Perfil) => Promise<void> }) {
  const [f, setF] = useState({
    fullName: perfil.fullName ?? "",
    dpi: perfil.dpi ?? "",
    phone: perfil.phone ?? "",
    address: perfil.address ?? "",
    title: perfil.title ?? "",
    collegiate: perfil.collegiate ?? "",
    specialty: perfil.specialty ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ perfil: Perfil }>("/api/docente/perfil/datos", { method: "PUT", body: f });
      await onSaved(r.perfil);
      setMsg({ ok: true, text: "Datos guardados." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tarjeta icono={UserRound} titulo="Datos personales" descripcion="Tu información de contacto y profesional.">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre completo *</label>
            <input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} required minLength={3} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>DPI</label>
            <input value={f.dpi} onChange={(e) => set("dpi", e.target.value)} inputMode="numeric" placeholder="13 dígitos" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección</label>
            <input value={f.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Título / profesión</label>
            <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Licenciada en Enfermería" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número de colegiado</label>
            <input value={f.collegiate} onChange={(e) => set("collegiate", e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Especialidad</label>
            <input value={f.specialty} onChange={(e) => set("specialty", e.target.value)} className={inputClass} />
          </div>
        </div>
        <Aviso msg={msg} />
        <Guardar busy={busy} />
      </form>
    </Tarjeta>
  );
}

function BancoForm({ perfil, onSaved }: { perfil: Perfil; onSaved: (p: Perfil) => void }) {
  const [f, setF] = useState({
    bankName: perfil.bankName ?? "",
    bankAccountType: perfil.bankAccountType ?? "",
    bankAccountNumber: perfil.bankAccountNumber ?? "",
    bankAccountHolder: perfil.bankAccountHolder ?? perfil.fullName ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ perfil: Perfil }>("/api/docente/perfil/banco", {
        method: "PUT",
        body: { ...f, bankAccountNumber: f.bankAccountNumber.replace(/\s+/g, "") },
      });
      onSaved(r.perfil);
      setMsg({ ok: true, text: "Cuenta bancaria guardada." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tarjeta
      icono={Building2}
      titulo="Cuenta bancaria"
      descripcion="Donde la escuela te deposita. Solo la ve la administración."
    >
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Banco *</label>
            <input
              value={f.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              list="bancos-gt"
              required
              placeholder="Elige o escribe el banco"
              className={inputClass}
            />
            <datalist id="bancos-gt">
              {BANCOS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Tipo de cuenta *</label>
            <select
              value={f.bankAccountType}
              onChange={(e) => set("bankAccountType", e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              <option value="MONETARIA">Monetaria</option>
              <option value="AHORRO">Ahorro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Número de cuenta *</label>
            <input
              value={f.bankAccountNumber}
              onChange={(e) => set("bankAccountNumber", e.target.value)}
              inputMode="numeric"
              required
              placeholder="Solo números y guiones"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nombre del titular *</label>
            <input
              value={f.bankAccountHolder}
              onChange={(e) => set("bankAccountHolder", e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>
        <Aviso msg={msg} />
        <Guardar busy={busy} texto="Guardar cuenta" />
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
    setBusy(true);
    try {
      await api("/api/docente/perfil/password", { method: "POST", body: { currentPassword, newPassword } });
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
    <Tarjeta icono={KeyRound} titulo="Contraseña" descripcion="Cambia la contraseña con la que entras al sistema.">
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Contraseña actual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Confirmar</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={inputClass} />
          </div>
        </div>
        <Aviso msg={msg} />
        <Guardar busy={busy} texto="Cambiar contraseña" />
      </form>
    </Tarjeta>
  );
}
