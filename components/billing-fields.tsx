"use client";

import { useState } from "react";
import { isValidCui, isValidNit, tipoDeTaxId, type TaxIdTipo } from "@/lib/nit";

// Datos de facturación de los recibos electrónicos (FEL): a nombre de quién
// salen. Se usa en el expediente, la inscripción y el portal del alumno.

export interface BillingValues {
  taxId: string;
  billingName: string;
  billingAddress: string;
  billingEmail: string;
}

export const emptyBilling: BillingValues = {
  taxId: "",
  billingName: "",
  billingAddress: "",
  billingEmail: "",
};

export function billingFrom(s: {
  taxId?: string | null;
  billingName?: string | null;
  billingAddress?: string | null;
  billingEmail?: string | null;
}): BillingValues {
  return {
    taxId: s.taxId ?? "",
    billingName: s.billingName ?? "",
    billingAddress: s.billingAddress ?? "",
    billingEmail: s.billingEmail ?? "",
  };
}

// Mensaje de error si el NIT/DPI escrito no es válido (null = correcto).
export function billingError(v: BillingValues, tipo: TaxIdTipo): string | null {
  if (tipo === "CF") return null;
  if (!v.taxId.trim()) return tipo === "NIT" ? "Escribe el NIT" : "Escribe el DPI";
  if (tipo === "NIT" && !isValidNit(v.taxId)) {
    return "El NIT no es válido: revisa el dígito verificador (el último, después del guion).";
  }
  if (tipo === "CUI" && !isValidCui(v.taxId)) return "El DPI debe tener 13 dígitos.";
  return null;
}

const TIPOS: [TaxIdTipo, string][] = [
  ["CF", "Consumidor final (CF)"],
  ["NIT", "NIT"],
  ["CUI", "DPI"],
];

export function BillingFields({
  value,
  onChange,
  nombreAlumno,
  inputClass,
  labelClass,
}: {
  value: BillingValues;
  onChange: (v: BillingValues, tipo: TaxIdTipo) => void;
  nombreAlumno?: string;
  inputClass: string;
  labelClass: string;
}) {
  const [tipo, setTipo] = useState<TaxIdTipo>(() => tipoDeTaxId(value.taxId));
  const [tocado, setTocado] = useState(false);
  const error = tocado ? billingError(value, tipo) : null;

  function cambiarTipo(t: TaxIdTipo) {
    setTipo(t);
    setTocado(false);
    // En CF no se guardan datos del titular: el recibo usa los del alumno.
    onChange(t === "CF" ? emptyBilling : { ...value, taxId: tipo === t ? value.taxId : "" }, t);
  }

  function set(k: keyof BillingValues, v: string) {
    onChange({ ...value, [k]: v }, tipo);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Facturar a">
        {TIPOS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => cambiarTipo(t)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              tipo === t
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tipo === "CF" ? (
        <p className="text-sm text-gray-500">
          Los recibos se emiten a consumidor final
          {nombreAlumno?.trim() ? ` a nombre de ${nombreAlumno.trim()}` : " con el nombre del estudiante"}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{tipo === "NIT" ? "NIT *" : "DPI *"}</label>
            <input
              value={value.taxId}
              onChange={(e) => set("taxId", e.target.value)}
              onBlur={() => setTocado(true)}
              placeholder={tipo === "NIT" ? "Ej. 1234567-8" : "13 dígitos"}
              inputMode={tipo === "CUI" ? "numeric" : "text"}
              aria-invalid={!!error}
              className={`${inputClass} ${error ? "border-red-400" : ""}`}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <div>
            <label className={labelClass}>Nombre del titular</label>
            <input
              value={value.billingName}
              onChange={(e) => set("billingName", e.target.value)}
              placeholder={`Como aparece en el ${tipo === "NIT" ? "NIT" : "DPI"} (ej. padre o madre)`}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dirección fiscal (opcional)</label>
            <input
              value={value.billingAddress}
              onChange={(e) => set("billingAddress", e.target.value)}
              placeholder="Si se deja vacía se usa la del estudiante"
              maxLength={190}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Correo para el recibo (opcional)</label>
            <input
              type="email"
              value={value.billingEmail}
              onChange={(e) => set("billingEmail", e.target.value)}
              placeholder="Si se deja vacío se usa el del estudiante"
              maxLength={190}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
