"use client";

import { FasesManager } from "@/components/fases-manager";

// El docente consulta el contenido de cada fase (lo crea la administración) y
// registra las calificaciones en la sección Calificaciones.
export default function DocenteFasesPage() {
  return (
    <FasesManager
      readOnly
      intro="Contenido de cada fase publicado por la administración: tareas, actividades, exámenes, materiales y el Reto de Comprensión. Las calificaciones las registras en la sección Calificaciones."
    />
  );
}
