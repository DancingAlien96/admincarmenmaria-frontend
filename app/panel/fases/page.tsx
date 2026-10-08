"use client";

import { useAuth } from "@/lib/auth-context";
import { FasesManager } from "@/components/fases-manager";

// Gestión de Fases desde el panel (administrador): mismo contenido que publica
// el docente; los estudiantes lo ven en su portal, sección Fases.
export default function PanelFasesPage() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return (
      <p className="text-sm text-gray-500">
        Solo el administrador puede gestionar las fases.
      </p>
    );
  }
  return (
    <div className="max-w-4xl">
      <FasesManager intro="Crea el contenido de cada fase para los estudiantes: tareas, actividades, exámenes y materiales descargables. Lo ven en su portal, sección Fases. Los catedráticos lo consultan y registran las calificaciones." />
    </div>
  );
}
