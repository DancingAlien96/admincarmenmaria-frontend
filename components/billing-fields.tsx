"use client";

import { useState } from "react";
import { compactTaxId, isValidCui, isValidNit } from "@/lib/nit";

// Datos de facturación de los recibos electrónicos (FEL). Formulario simple:
// sin NIT, los recibos salen a consumidor final (CF). Se usa en el expediente,
// la inscripción y el portal del alumno.

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

// Mensaje de error si el NIT escrito no es válido (null = correcto o vacío/CF).
export function billingError(v: BillingValues): string | null {
  const c = compactTaxId(v.taxId);
  if (!c || c === "CF") return null;
  if (isValidCui(c) || isValidNit(c)) return null;
  return "El NIT no es válido: revisa el dígito verificador (el último, después del guion). También puedes escribir un DPI de 13 dígitos.";
}

export function BillingFields({
  value,
  onChange,
  inputClass,
  labelClass,
}: {
  value: BillingValues;
  onChange: (v: BillingValues) => void;
  inputClass: string;
  labelClass: string;
}) {
  const [tocado, setTocado] = useState(false);
  const error = tocado ? billingError(value) : null;

  function set(k: keyof BillingValues, v: string) {
    onChange({ ...value, [k]: v });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>NIT</label>
        <input
          value={value.taxId}
          onChange={(e) => set("taxId", e.target.value)}
          onBlur={() => setTocado(true)}
          placeholder="Ej. 1234567-8"
          aria-invalid={!!error}
          className={`${inputClass} ${error ? "border-red-400" : ""}`}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">Si lo dejas vacío, los recibos salen a consumidor final (CF).</p>
        )}
      </div>
      <div>
        <label className={labelClass}>Nombre</label>
        <input
          value={value.billingName}
          onChange={(e) => set("billingName", e.target.value)}
          placeholder="Nombre que aparecerá en el recibo"
          maxLength={200}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Dirección</label>
        <input
          value={value.billingAddress}
          onChange={(e) => set("billingAddress", e.target.value)}
          placeholder="Ej. Ciudad"
          maxLength={190}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Correo</label>
        <input
          type="email"
          value={value.billingEmail}
          onChange={(e) => set("billingEmail", e.target.value)}
          placeholder="Para enviarte el recibo"
          maxLength={190}
          className={inputClass}
        />
      </div>
    </div>
  );
}
