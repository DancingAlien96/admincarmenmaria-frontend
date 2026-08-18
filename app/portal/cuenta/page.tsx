"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function PortalCuentaPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (newPassword !== confirm) {
      setError("La nueva contraseña y su confirmación no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await api("/api/portal/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setOk(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-xl font-bold text-gray-800">Cambiar contraseña</h1>
      <p className="mb-6 text-sm text-gray-500">
        Elige una contraseña que solo tú conozcas.
      </p>

      {ok && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ Tu contraseña se cambió correctamente.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contraseña actual
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
