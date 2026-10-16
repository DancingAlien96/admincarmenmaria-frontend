"use client";

import { PortalFacturacion } from "@/components/portal-facturacion";

export default function PortalFacturacionPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">Facturación</h1>
        <p className="text-sm text-gray-500">
          Datos con los que se emiten tus recibos electrónicos (FEL).
        </p>
      </div>
      <PortalFacturacion />
    </div>
  );
}
