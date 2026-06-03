"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FEE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type {
  FeeType,
  PaymentMethod,
  StudentListItem,
} from "@/lib/types";

const METHODS: PaymentMethod[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "DEPOSITO",
  "TARJETA",
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface Props {
  fees: FeeType[];
  onCreated: () => Promise<void>;
  onCancel: () => void;
}

export function RegisterPaymentForm({ fees, onCreated, onCancel }: Props) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentId, setStudentId] = useState("");
  const [feeTypeId, setFeeTypeId] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("EFECTIVO");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api<{ data: StudentListItem[] }>("/api/students?pageSize=100").then(
      (r) => setStudents(r.data)
    );
  }, []);

  // Al elegir una cuota, autocompleta concepto y monto
  function selectFee(id: string) {
    setFeeTypeId(id);
    const fee = fees.find((f) => f.id === id);
    if (fee) {
      setConcept((c) => c || fee.name);
      setAmount(String(fee.amount));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/api/payments", {
        method: "POST",
        body: {
          studentId,
          feeTypeId: feeTypeId || null,
          concept,
          amount: Number(amount),
          discount: Number(discount) || 0,
          method,
          paidAt,
        },
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <h2 className="mb-4 font-semibold text-brand-800">Registrar pago manual</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-gray-600">Estudiante *</label>
          <select
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona un estudiante…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} — {s.dpi}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Tipo de cuota
          </label>
          <select
            value={feeTypeId}
            onChange={(e) => selectFee(e.target.value)}
            className={inputClass}
          >
            <option value="">Libre / sin cuota</option>
            {fees.map((f) => (
              <option key={f.id} value={f.id}>
                {FEE_CATEGORY_LABELS[f.category]} · {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Método *</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={inputClass}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-gray-600">Concepto *</label>
          <input
            required
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className={inputClass}
            placeholder="Ej. Mensualidad Teoría — mayo"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Monto (Q) *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Descuento / beca (Q)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Fecha de pago
          </label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Registrar pago"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
