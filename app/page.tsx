"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La raíz lleva al login; el login redirige al panel, portal o docente si ya
// hay sesión.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800 text-sm text-white/80">
      Cargando…
    </div>
  );
}
