"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export default function NewGraduatePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dpi, setDpi] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mspasCode, setMspasCode] = useState("");
  const [diplomaNumber, setDiplomaNumber] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { graduate } = await api<{ graduate: { id: string } }>(
        "/api/graduates",
        {
          method: "POST",
          body: {
            fullName,
            dpi,
            email,
            phone,
            mspasCode,
            diplomaNumber: diplomaNumber || undefined,
            graduationDate,
          },
        }
      );
      router.replace(`/panel/diplomas/${graduate.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        href="/panel/diplomas"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver a la banca de diplomas
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-800">
        Registrar egresado
      </h1>

      <form
        onSubmit={submit}
        className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre completo *</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>DPI *</label>
            <input
              required
              value={dpi}
              onChange={(e) => setDpi(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha de graduación *</label>
            <input
              type="date"
              required
              value={graduationDate}
              onChange={(e) => setGraduationDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Celular</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Código MSPAS</label>
            <input
              value={mspasCode}
              onChange={(e) => setMspasCode(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              No. de diploma{" "}
              <span className="text-gray-400">(vacío = automático)</span>
            </label>
            <input
              value={diplomaNumber}
              onChange={(e) => setDiplomaNumber(e.target.value)}
              placeholder="CM-2026-001"
              className={inputClass}
            />
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
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Registrando…" : "Registrar egresado"}
        </button>
      </form>
    </div>
  );
}
