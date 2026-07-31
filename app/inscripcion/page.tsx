"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface InviteInfo {
  mode: "activacion" | "inscripcion";
  studentName?: string | null;
  studentEmail?: string | null;
  expediente?: string | null;
  sede?: string | null;
  prefillName?: string | null;
  cohorteYear?: number | null;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

function InscripcionInner() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const { login } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    dpi: "",
    department: "",
    municipality: "",
    sede: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoadErr("Falta el código de invitación.");
      setLoading(false);
      return;
    }
    try {
      const inv = await api<InviteInfo>(`/api/portal-invites/${token}`);
      setInvite(inv);
      setForm((f) => ({
        ...f,
        fullName: inv.prefillName ?? "",
        sede: inv.sede ?? "",
        email: inv.studentEmail ?? "",
      }));
    } catch (e) {
      setLoadErr(
        e instanceof ApiError ? e.message : "La invitación no es válida."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/portal-invites/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          dpi: form.dpi,
          department: form.department,
          municipality: form.municipality,
          sede: form.sede,
          phone: form.phone,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.message ?? "No se pudo completar el registro");
        }
      });
      // Inicia sesión con las credenciales recién creadas y entra al portal.
      await login(form.email, form.password);
      router.replace("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarte");
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-center text-gray-400">Cargando…</p>;
  }
  if (loadErr || !invite) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-brand-800">Invitación no válida</h1>
        <p className="mt-2 text-sm text-gray-500">
          {loadErr ?? "El enlace no es válido o ya fue utilizado."}
        </p>
      </div>
    );
  }

  const isActivation = invite.mode === "activacion";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logocarmenmaria.png"
            alt="Carmen María"
            className="mx-auto mb-2 h-14 w-14 object-contain"
          />
          <h1 className="text-xl font-bold text-brand-800">
            {isActivation ? "Activa tu acceso" : "Inscripción"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Escuela de Enfermería Carmen María
          </p>
        </div>

        {isActivation && (
          <div className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <p className="font-medium">{invite.studentName}</p>
            {invite.expediente && (
              <p className="text-xs text-brand-700">
                Expediente {invite.expediente}
                {invite.sede ? ` · ${invite.sede}` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Crea tu contraseña para entrar al portal.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {!isActivation && (
            <>
              <div>
                <label className={labelClass}>Nombre completo *</label>
                <input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputClass} placeholder="Nombres y apellidos" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>DPI</label>
                  <input value={form.dpi} onChange={(e) => set("dpi", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Departamento</label>
                  <input value={form.department} onChange={(e) => set("department", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Municipio</label>
                  <input value={form.municipality} onChange={(e) => set("municipality", e.target.value)} className={inputClass} />
                </div>
              </div>
              {!invite.sede && (
                <div>
                  <label className={labelClass}>Sede</label>
                  <select value={form.sede} onChange={(e) => set("sede", e.target.value)} className={inputClass}>
                    <option value="">Selecciona…</option>
                    <option value="Chiquimula">Chiquimula</option>
                    <option value="Morales Izabal">Morales Izabal</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className={labelClass}>Correo electrónico *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Contraseña *</label>
              <input type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className={labelClass}>Confirmar *</label>
              <input type="password" required value={form.confirm} onChange={(e) => set("confirm", e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving
              ? "Procesando…"
              : isActivation
                ? "Activar acceso"
                : "Completar inscripción"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InscripcionPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-gray-400">Cargando…</p>}>
      <InscripcionInner />
    </Suspense>
  );
}
