"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La contraseña ahora se cambia en "Mi perfil" (enlaces antiguos).
export default function PortalCuentaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portal/perfil");
  }, [router]);
  return <p className="text-sm text-gray-400">Abriendo tu perfil…</p>;
}
