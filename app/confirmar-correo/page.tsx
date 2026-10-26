"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

// Enlace que recibe el alumno en su correo nuevo para confirmar el cambio.
function ConfirmarCorreo() {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<
    { tipo: "cargando" } | { tipo: "ok"; email: string } | { tipo: "error"; msg: string }
  >({ tipo: "cargando" });

  useEffect(() => {
    if (!token) {
      setEstado({ tipo: "error", msg: "El enlace está incompleto." });
      return;
    }
    api<{ email: string }>("/api/auth/confirmar-correo", { method: "POST", body: { token } })
      .then((r) => setEstado({ tipo: "ok", email: r.email }))
      .catch((err) =>
        setEstado({
          tipo: "error",
          msg: err instanceof ApiError ? err.message : "No se pudo confirmar el correo.",
        })
      );
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        {estado.tipo === "cargando" && <p className="text-gray-500">Confirmando tu correo…</p>}
        {estado.tipo === "ok" && (
          <>
            <CircleCheck aria-hidden className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-3 text-xl font-bold text-gray-900">¡Correo confirmado!</h1>
            <p className="mt-2 text-sm text-gray-600">
              Desde ahora inicias sesión en el Campus con <strong>{estado.email}</strong>.
            </p>
          </>
        )}
        {estado.tipo === "error" && (
          <>
            <CircleAlert aria-hidden className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-3 text-xl font-bold text-gray-900">No se pudo confirmar</h1>
            <p className="mt-2 text-sm text-gray-600">{estado.msg}</p>
          </>
        )}
        {estado.tipo !== "cargando" && (
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ir a iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarCorreoPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmarCorreo />
    </Suspense>
  );
}
