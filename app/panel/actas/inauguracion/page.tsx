"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El listado de inauguración ahora vive como pestaña dentro de /panel/actas.
// Esta ruta se mantiene como redirección para enlaces antiguos.
export default function InauguracionRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/panel/actas?tab=inauguracion");
  }, [router]);
  return <p className="text-gray-400">Redirigiendo…</p>;
}
