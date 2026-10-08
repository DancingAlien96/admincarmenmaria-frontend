"use client";

import { createContext, useContext } from "react";
import type { PortalMe } from "@/lib/types";

// Datos del alumno compartidos por el marco del portal y sus páginas.
export const PortalMeContext = createContext<{
  me: PortalMe | null;
  reload: () => Promise<void>;
}>({ me: null, reload: async () => {} });

export function usePortalMe() {
  return useContext(PortalMeContext);
}
