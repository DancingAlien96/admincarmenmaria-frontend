"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Ventanas emergentes del sistema (reemplazan alert/confirm/prompt del
// navegador). Se pueden llamar desde cualquier parte:
//   await showAlert("Guardado");
//   if (!(await showConfirm("¿Eliminar esta acta?"))) return;
//   const motivo = await showPrompt("Motivo de anulación");
// <DialogHost /> (en el layout raíz) las muestra una a la vez.

type Tono = "info" | "exito" | "error" | "peligro";

interface Opciones {
  titulo?: string;
  aceptar?: string;
  cancelar?: string;
  tono?: Tono;
}

interface PromptOpciones extends Opciones {
  placeholder?: string;
  valorInicial?: string;
  requerido?: boolean;
}

type Solicitud =
  | { id: number; tipo: "alert"; mensaje: string; op: Opciones; resolver: () => void }
  | { id: number; tipo: "confirm"; mensaje: string; op: Opciones; resolver: (ok: boolean) => void }
  | {
      id: number;
      tipo: "prompt";
      mensaje: string;
      op: PromptOpciones;
      resolver: (valor: string | null) => void;
    };

let cola: Solicitud[] = [];
let siguienteId = 1;
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((o) => o());

function encolar(s: Solicitud) {
  cola = [...cola, s];
  emitir();
}

function cerrar(id: number) {
  cola = cola.filter((s) => s.id !== id);
  emitir();
}

// Tono por el texto, si no se indica: errores y acciones destructivas en rojo.
function tonoDe(mensaje: string, tipo: Solicitud["tipo"]): Tono {
  if (tipo !== "alert" && /eliminar|quitar|desactivar|dar de baja|anular|borrar/i.test(mensaje)) {
    return "peligro";
  }
  if (tipo === "alert" && /no se pudo|error|inválid|no es válid|no puede|falta|máximo|no hay/i.test(mensaje)) {
    return "error";
  }
  return "info";
}

export function showAlert(mensaje: string, op: Opciones = {}): Promise<void> {
  return new Promise((resolve) =>
    encolar({ id: siguienteId++, tipo: "alert", mensaje, op, resolver: resolve })
  );
}

export function showConfirm(mensaje: string, op: Opciones = {}): Promise<boolean> {
  return new Promise((resolve) =>
    encolar({ id: siguienteId++, tipo: "confirm", mensaje, op, resolver: resolve })
  );
}

export function showPrompt(mensaje: string, op: PromptOpciones = {}): Promise<string | null> {
  return new Promise((resolve) =>
    encolar({ id: siguienteId++, tipo: "prompt", mensaje, op, resolver: resolve })
  );
}

const suscribir = (o: () => void) => {
  oyentes.add(o);
  return () => oyentes.delete(o);
};
const vacia: Solicitud[] = [];

const ESTILO: Record<Tono, { icono: typeof Info; color: string; boton: string }> = {
  info: { icono: Info, color: "bg-brand-50 text-brand-600", boton: "bg-brand-600 hover:bg-brand-700" },
  exito: { icono: CircleCheck, color: "bg-green-50 text-green-600", boton: "bg-brand-600 hover:bg-brand-700" },
  error: { icono: CircleAlert, color: "bg-red-50 text-red-600", boton: "bg-brand-600 hover:bg-brand-700" },
  peligro: { icono: TriangleAlert, color: "bg-red-50 text-red-600", boton: "bg-red-600 hover:bg-red-700" },
};

export function DialogHost() {
  const lista = useSyncExternalStore(suscribir, () => cola, () => vacia);
  const actual = lista[0];
  if (!actual) return null;
  return <Dialogo key={actual.id} s={actual} />;
}

function Dialogo({ s }: { s: Solicitud }) {
  const tono = s.op.tono ?? tonoDe(s.mensaje, s.tipo);
  const { icono: Icono, color, boton } = ESTILO[tono];
  const [valor, setValor] = useState(s.tipo === "prompt" ? s.op.valorInicial ?? "" : "");
  const aceptarRef = useRef<HTMLButtonElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const requerido = s.tipo === "prompt" && s.op.requerido;

  function aceptar() {
    if (s.tipo === "prompt") {
      if (requerido && !valor.trim()) return;
      s.resolver(valor.trim());
    } else if (s.tipo === "confirm") s.resolver(true);
    else s.resolver();
    cerrar(s.id);
  }

  function cancelar() {
    if (s.tipo === "prompt") s.resolver(null);
    else if (s.tipo === "confirm") s.resolver(false);
    else s.resolver();
    cerrar(s.id);
  }

  useEffect(() => {
    (s.tipo === "prompt" ? campoRef.current : aceptarRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titulo =
    s.op.titulo ??
    (s.tipo === "confirm" ? "Confirmar" : tono === "error" ? "Atención" : s.tipo === "prompt" ? "" : "Aviso");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && cancelar()}
    >
      <div
        role={s.tipo === "alert" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={`dlg-${s.id}`}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
            <Icono aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            {titulo && (
              <h2 id={`dlg-${s.id}`} className="font-semibold text-gray-900">
                {titulo}
              </h2>
            )}
            <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{s.mensaje}</p>
          </div>
        </div>

        {s.tipo === "prompt" && (
          <textarea
            ref={campoRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                aceptar();
              }
            }}
            placeholder={s.op.placeholder}
            rows={3}
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          {s.tipo !== "alert" && (
            <button
              onClick={cancelar}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {s.op.cancelar ?? "Cancelar"}
            </button>
          )}
          <button
            ref={aceptarRef}
            onClick={aceptar}
            disabled={!!requerido && !valor.trim()}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${boton}`}
          >
            {s.op.aceptar ?? (s.tipo === "alert" ? "Entendido" : tono === "peligro" ? "Sí, continuar" : "Aceptar")}
          </button>
        </div>
      </div>
    </div>
  );
}
