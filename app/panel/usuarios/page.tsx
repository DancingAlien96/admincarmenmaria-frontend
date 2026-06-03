"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SECTION_LABELS } from "@/lib/labels";
import type {
  ManagedUser,
  ModuleSection,
  Permission,
  PermissionLevel,
} from "@/lib/types";

const SECTIONS = Object.keys(SECTION_LABELS) as ModuleSection[];

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users } = await api<{ users: ManagedUser[] }>("/api/users");
      setUsers(users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deactivate(id: string) {
    if (!confirm("¿Desactivar este usuario?")) return;
    await api(`/api/users/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">
            Usuarios y permisos
          </h1>
          <p className="text-sm text-gray-500">
            Hasta 5 usuarios de personal, con permisos por módulo.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? "Cerrar" : "+ Nuevo usuario"}
        </button>
      </div>

      {showForm && (
        <CreateUserForm
          onCreated={async () => {
            setShowForm(false);
            await load();
          }}
        />
      )}

      {/* Tabla (escritorio) */}
      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Permisos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === "ADMIN" ? "Administrador" : "Personal"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.role === "ADMIN"
                      ? "Acceso total"
                      : u.permissions.length === 0
                        ? "—"
                        : u.permissions
                            .map(
                              (p: Permission) =>
                                `${SECTION_LABELS[p.section]} (${
                                  p.level === "EDITOR" ? "editor" : "lector"
                                })`
                            )
                            .join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && u.active && (
                      <button
                        onClick={() => void deactivate(u.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="mt-4 space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Cargando…</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    u.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {u.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {u.role === "ADMIN" ? "Administrador" : "Personal"}
                </span>
                {" · "}
                {u.role === "ADMIN"
                  ? "Acceso total"
                  : u.permissions.length === 0
                    ? "Sin permisos"
                    : u.permissions
                        .map(
                          (p: Permission) =>
                            `${SECTION_LABELS[p.section]} (${
                              p.level === "EDITOR" ? "editor" : "lector"
                            })`
                        )
                        .join(", ")}
              </p>
              {u.id !== user?.id && u.active && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => void deactivate(u.id)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Desactivar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Record<string, PermissionLevel | "NONE">>(
    Object.fromEntries(SECTIONS.map((s) => [s, "NONE"]))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const permissions = SECTIONS.filter((s) => perms[s] !== "NONE").map(
        (s) => ({ section: s, level: perms[s] as PermissionLevel })
      );
      await api("/api/users", {
        method: "POST",
        body: { name, email, password, role: "STAFF", permissions },
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <h2 className="mb-4 font-semibold text-brand-800">Nuevo usuario</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          placeholder="Nombre"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="Correo"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="Contraseña (mín. 8)"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-brand-800">
        Permisos por módulo
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <div
            key={s}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          >
            <span className="text-sm text-gray-700">{SECTION_LABELS[s]}</span>
            <select
              value={perms[s]}
              onChange={(e) =>
                setPerms((p) => ({
                  ...p,
                  [s]: e.target.value as PermissionLevel | "NONE",
                }))
              }
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="NONE">Sin acceso</option>
              <option value="READER">Lector</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}
