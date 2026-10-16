// Validación de la identificación fiscal en el navegador (mismas reglas que el
// backend, src/lib/nit.ts): NIT con dígito verificador, CUI/DPI de 13 dígitos o CF.

export type TaxIdTipo = "NIT" | "CUI" | "CF";

export function compactTaxId(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCui(value: string): boolean {
  return /^\d{13}$/.test(compactTaxId(value));
}

// Módulo 11; "K" equivale a 10.
export function isValidNit(value: string): boolean {
  const compact = compactTaxId(value);
  if (!/^\d{1,12}[0-9K]$/.test(compact) || compact.length < 2) return false;
  const body = compact.slice(0, -1);
  const check = compact.slice(-1);
  let sum = 0;
  let weight = body.length + 1;
  for (const ch of body) {
    sum += Number(ch) * weight;
    weight--;
  }
  const mod = (11 - (sum % 11)) % 11;
  return check === (mod === 10 ? "K" : String(mod));
}

// Tipo según lo guardado: vacío = CF, 13 dígitos = DPI, si no NIT.
export function tipoDeTaxId(taxId: string | null | undefined): TaxIdTipo {
  const c = compactTaxId(taxId);
  if (!c || c === "CF") return "CF";
  return /^\d{13}$/.test(c) ? "CUI" : "NIT";
}
