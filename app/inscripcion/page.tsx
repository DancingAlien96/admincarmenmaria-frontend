"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError, apiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GT_DEPARTAMENTOS_LIST, municipiosDe } from "@/lib/gt-geo";

interface InviteInfo {
  mode: "activacion" | "inscripcion" | "cerrado";
  studentName?: string | null;
  studentEmail?: string | null;
  expediente?: string | null;
  sede?: string | null;
  prefillName?: string | null;
  cohorteYear?: number | null;
}

interface GuardianForm {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

const CURRENT_YEAR = new Date().getFullYear();
const START_YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - 1 + i);

function InscripcionInner() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const { login } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    primerNombre: "",
    segundoNombre: "",
    tercerNombre: "",
    primerApellido: "",
    segundoApellido: "",
    tercerApellido: "",
    dpi: "",
    birthDate: "",
    department: "",
    municipality: "",
    address: "",
    sede: "",
    phone: "",
    phoneAlt: "",
    startYear: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [guardians, setGuardians] = useState<GuardianForm[]>([
    { name: "", relationship: "", phone: "", email: "" },
  ]);
  const [photo, setPhoto] = useState<{ url: string; key: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
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
        sede: inv.sede ?? "",
        email: inv.studentEmail ?? "",
        startYear: inv.cohorteYear ? String(inv.cohorteYear) : "",
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

  function setGuardian(i: number, k: keyof GuardianForm, v: string) {
    setGuardians((gs) => gs.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)));
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Vista previa local inmediata (antes de que termine la subida).
    setPreview(URL.createObjectURL(file));
    setPhoto(null);
    setPhotoBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${apiUrl}/api/portal-invites/${token}/photo`, {
        method: "POST",
        body: fd,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message ?? "No se pudo subir la foto");
      }
      const stored = (await r.json()) as { url: string; key: string };
      setPhoto({ url: stored.url, key: stored.key });
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const isActivation = invite?.mode === "activacion";
    // Contraseña por defecto en la inscripción = DPI del alumno (sin espacios).
    const dpiClean = form.dpi.replace(/\s+/g, "");

    if (!isActivation) {
      if (!form.primerNombre.trim() || !form.primerApellido.trim()) {
        setError("Escribe al menos tu primer nombre y primer apellido.");
        return;
      }
      if (!photo) {
        setError("Sube una fotografía del estudiante.");
        return;
      }
      if (dpiClean.length < 6) {
        setError("El DPI no es válido (será tu contraseña de acceso).");
        return;
      }
    } else {
      if (form.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (form.password !== form.confirm) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    const loginPassword = isActivation ? form.password : dpiClean;
    setSaving(true);
    try {
      const body = isActivation
        ? { email: form.email, password: form.password }
        : {
            email: form.email,
            primerNombre: form.primerNombre,
            segundoNombre: form.segundoNombre,
            tercerNombre: form.tercerNombre,
            primerApellido: form.primerApellido,
            segundoApellido: form.segundoApellido,
            tercerApellido: form.tercerApellido,
            dpi: form.dpi,
            birthDate: form.birthDate,
            department: form.department,
            municipality: form.municipality,
            address: form.address,
            sede: form.sede,
            phone: form.phone,
            phoneAlt: form.phoneAlt,
            startYear: Number(form.startYear) || undefined,
            photoUrl: photo?.url,
            photoKey: photo?.key,
            guardians: guardians
              .filter((g) => g.name.trim())
              .map((g) => ({
                name: g.name,
                relationship: g.relationship,
                phone: g.phone,
                email: g.email,
              })),
          };
      const r = await fetch(`${apiUrl}/api/portal-invites/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message ?? "No se pudo completar el registro");
      }
      await login(form.email, loginPassword);
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

  // Inscripciones cerradas por el admin.
  if (invite.mode === "cerrado") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-800 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logocarmenmaria.png"
            alt="Carmen María"
            className="mx-auto mb-3 h-14 w-14 object-contain"
          />
          <h1 className="text-xl font-bold text-brand-800">
            Inscripciones cerradas
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            En este momento las inscripciones no están disponibles. Comunícate
            con la Escuela de Enfermería Carmen María para más información.
          </p>
        </div>
      </div>
    );
  }

  const isActivation = invite.mode === "activacion";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logocarmenmaria.png"
            alt="Carmen María"
            className="mx-auto mb-2 h-14 w-14 object-contain"
          />
          <h1 className="text-xl font-bold text-brand-800">
            {isActivation ? "Activa tu acceso" : "Ficha de inscripción"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Escuela de Enfermería Carmen María
          </p>
        </div>

        {isActivation ? (
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
        ) : (
          <p className="mb-4 text-center text-xs text-gray-400">
            Completa tus datos reales. Los campos con{" "}
            <span className="text-red-400">*</span> son obligatorios.
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          {!isActivation && (
            <>
              {/* Fotografía */}
              <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-3">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {preview || photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview ?? photo!.url}
                        alt="Foto del estudiante"
                        className="h-full w-full object-cover"
                      />
                      {photoBusy && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white">
                          Subiendo…
                        </span>
                      )}
                      {photo && !photoBusy && (
                        <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-3xl text-gray-300">📷</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={labelClass}>Fotografía del estudiante *</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onPhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={photoBusy}
                    className="rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                  >
                    {photoBusy
                      ? "Subiendo…"
                      : photo
                        ? "Cambiar foto"
                        : "Subir foto"}
                  </button>
                  <p className="mt-1 text-xs text-gray-400">
                    Foto reciente, rostro visible. JPG o PNG.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Primer nombre *</label>
                  <input
                    required
                    value={form.primerNombre}
                    onChange={(e) => set("primerNombre", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Segundo nombre</label>
                  <input
                    value={form.segundoNombre}
                    onChange={(e) => set("segundoNombre", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tercer nombre</label>
                  <input
                    value={form.tercerNombre}
                    onChange={(e) => set("tercerNombre", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="hidden sm:block" />
                <div>
                  <label className={labelClass}>Primer apellido *</label>
                  <input
                    required
                    value={form.primerApellido}
                    onChange={(e) => set("primerApellido", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Segundo apellido</label>
                  <input
                    value={form.segundoApellido}
                    onChange={(e) => set("segundoApellido", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Tercer apellido{" "}
                    <span className="font-normal text-gray-400">(opcional)</span>
                  </label>
                  <input
                    value={form.tercerApellido}
                    onChange={(e) => set("tercerApellido", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>DPI *</label>
                  <input
                    required
                    value={form.dpi}
                    onChange={(e) => set("dpi", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fecha de nacimiento *</label>
                  <input
                    type="date"
                    required
                    value={form.birthDate}
                    onChange={(e) => set("birthDate", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono alternativo</label>
                  <input
                    value={form.phoneAlt}
                    onChange={(e) => set("phoneAlt", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Departamento *</label>
                  <select
                    required
                    value={form.department}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        department: e.target.value,
                        municipality: "", // se reinicia al cambiar departamento
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Selecciona…</option>
                    {GT_DEPARTAMENTOS_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Municipio *</label>
                  <select
                    required
                    value={form.municipality}
                    disabled={!form.department}
                    onChange={(e) => set("municipality", e.target.value)}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100`}
                  >
                    <option value="">
                      {form.department
                        ? "Selecciona…"
                        : "Elige un departamento primero"}
                    </option>
                    {municipiosDe(form.department).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Dirección exacta *</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Sede *</label>
                  <select
                    required
                    value={form.sede}
                    onChange={(e) => set("sede", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecciona…</option>
                    <option value="Chiquimula">Chiquimula</option>
                    <option value="Morales Izabal">Morales Izabal</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>¿En qué año inicias? *</label>
                  <select
                    required
                    value={form.startYear}
                    onChange={(e) => set("startYear", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecciona…</option>
                    {START_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Responsables */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className={labelClass + " mb-0"}>
                    Persona(s) responsable(s){" "}
                    <span className="font-normal text-gray-400">(opcional)</span>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setGuardians((gs) => [
                        ...gs,
                        { name: "", relationship: "", phone: "", email: "" },
                      ])
                    }
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {guardians.map((g, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-2">
                      <input
                        placeholder="Nombre"
                        value={g.name}
                        onChange={(e) => setGuardian(i, "name", e.target.value)}
                        className={inputClass}
                      />
                      <input
                        placeholder="Parentesco (madre, padre…)"
                        value={g.relationship}
                        onChange={(e) =>
                          setGuardian(i, "relationship", e.target.value)
                        }
                        className={inputClass}
                      />
                      <input
                        placeholder="Teléfono"
                        value={g.phone}
                        onChange={(e) => setGuardian(i, "phone", e.target.value)}
                        className={inputClass}
                      />
                      <input
                        placeholder="Correo"
                        value={g.email}
                        onChange={(e) => setGuardian(i, "email", e.target.value)}
                        className={inputClass}
                      />
                      {guardians.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setGuardians((gs) => gs.filter((_, idx) => idx !== i))
                          }
                          className="justify-self-start text-xs text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
          {isActivation ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contraseña *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={inputClass}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className={labelClass}>Confirmar *</label>
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              🔑 Tu contraseña será tu <strong>DPI</strong> (sin espacios).
              Podrás cambiarla después desde el portal, en “Cambiar contraseña”.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || photoBusy}
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
