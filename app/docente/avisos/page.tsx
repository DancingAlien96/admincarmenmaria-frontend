"use client";

import { AvisosList } from "@/components/avisos-list";
import { PushToggle } from "@/components/push-toggle";

export default function DocenteAvisosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-800 sm:text-2xl">Avisos</h1>
        <p className="text-sm text-gray-500">Comunicados de la administración de la escuela.</p>
      </div>
      <div id="activar" className="scroll-mt-20">
        <PushToggle />
      </div>
      <AvisosList emptyText="Aún no tienes avisos de la administración." />
    </div>
  );
}
