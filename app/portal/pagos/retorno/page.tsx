"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type Estado = "cargando" | "aprobado" | "rechazado" | "revision" | "no_encontrado" | "error";

function RetornoInner() {
  const sp = useSearchParams();
  const [estado, setEstado] = useState<Estado>("cargando");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita doble ejecución
    ran.current = true;
    const body = {
      order: sp.get("order") ?? "",
      tpt: sp.get("tpt") ?? "",
      code: sp.get("code") ?? "",
      auth: sp.get("auth") ?? "",
      orderHash: sp.get("OrderHash") ?? sp.get("orderHash") ?? "",
    };
    api<{ status: Estado }>("/api/portal/pagos/confirmar-tarjeta", {
      method: "POST",
      body,
    })
      .then((r) => setEstado(r.status))
      .catch(() => setEstado("error"));
  }, [sp]);

  const meta: Record<Estado, { icon: string; title: string; text: string; color: string }> = {
    cargando: { icon: "⏳", title: "Confirmando tu pago…", text: "Un momento, por favor.", color: "text-gray-600" },
    aprobado: { icon: "✅", title: "¡Pago aprobado!", text: "Tu cuota quedó pagada. Te enviamos la confirmación por correo.", color: "text-green-700" },
    rechazado: { icon: "❌", title: "Pago no completado", text: "El pago fue rechazado o cancelado. Puedes intentarlo de nuevo.", color: "text-red-700" },
    revision: { icon: "🕓", title: "Pago en revisión", text: "Recibimos tu pago pero necesita confirmación de la escuela. Te avisaremos.", color: "text-amber-700" },
    no_encontrado: { icon: "❓", title: "No encontramos el pago", text: "Si te cobraron, comunícate con la escuela.", color: "text-gray-700" },
    error: { icon: "⚠️", title: "Ocurrió un problema", text: "No pudimos confirmar el pago. Si te cobraron, comunícate con la escuela.", color: "text-red-700" },
  };
  const m = meta[estado];

  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <p className="text-5xl">{m.icon}</p>
        <h1 className={`mt-3 text-xl font-bold ${m.color}`}>{m.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{m.text}</p>
        <Link
          href="/portal/pagos"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Volver a mis pagos
        </Link>
      </div>
    </div>
  );
}

export default function RetornoPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <RetornoInner />
    </Suspense>
  );
}
