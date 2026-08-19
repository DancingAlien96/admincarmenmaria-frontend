"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  canAccess,
  DOC_TYPE_LABELS,
  formatGTQ,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";
import type {
  CuotaPlanItem,
  DocumentType,
  PaymentMethod,
  StudentAccount,
  StudentChecklist,
  StudentDetail,
  StudentStatus,
} from "@/lib/types";
import {
  StudentForm,
  type StudentFormValues,
} from "@/components/student-form";
import { uploadFile } from "@/lib/upload";

const STATUSES: StudentStatus[] = ["ACTIVO", "EGRESADO", "BAJA"];
const DOC_TYPES = Object.keys(DOC_TYPE_LABELS) as DocumentType[];

function toFormValues(s: StudentDetail): StudentFormValues {
  return {
    fullName: s.fullName,
    dpi: s.dpi ?? "",
    birthDate: s.birthDate ? s.birthDate.slice(0, 10) : "",
    enrollmentDate: s.enrollmentDate ? s.enrollmentDate.slice(0, 10) : "",
    department: s.department ?? "",
    municipality: s.municipality ?? "",
    address: s.address ?? "",
    sede: s.sede ?? "",
    phonePrimary: s.phonePrimary ?? "",
    phoneAlt: s.phoneAlt ?? "",
    email: s.email ?? "",
    guardians: s.guardians.map((g) => ({
      name: g.name,
      relationship: g.relationship ?? "",
      phone: g.phone ?? "",
      email: g.email ?? "",
    })),
  };
}

function StudentDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { user } = useAuth();
  const canEdit = canAccess(user, "STUDENTS", "EDITOR");
  const canPagos = canAccess(user, "PAYMENTS", "READER");
  const canPagosEdit = canAccess(user, "PAYMENTS", "EDITOR");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [portalCreds, setPortalCreds] = useState<{
    email: string;
    defaultPassword: string;
    reset: boolean;
  } | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [pagosRefresh, setPagosRefresh] = useState(0);

  async function crearAccesoPortal() {
    setPortalBusy(true);
    setPortalCreds(null);
    try {
      const r = await api<{ email: string; defaultPassword: string; reset: boolean }>(
        `/api/students/${id}/portal-account`,
        { method: "POST" }
      );
      setPortalCreds(r);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo crear el acceso");
    } finally {
      setPortalBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { student } = await api<{ student: StudentDetail }>(
        `/api/students/${id}`
      );
      setStudent(student);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-gray-400">Cargando expediente…</p>;
  }
  if (!student) {
    return <p className="text-gray-500">Expediente no encontrado.</p>;
  }

  async function saveEdit(values: StudentFormValues) {
    await api(`/api/students/${id}`, {
      method: "PATCH",
      body: {
        fullName: values.fullName,
        dpi: values.dpi,
        birthDate: values.birthDate || null,
        enrollmentDate: values.enrollmentDate || null,
        department: values.department,
        municipality: values.municipality,
        address: values.address,
        sede: values.sede,
        phonePrimary: values.phonePrimary,
        phoneAlt: values.phoneAlt,
        email: values.email,
        guardians: values.guardians,
      },
    });
    setEditing(false);
    await load();
  }

  return (
    <div>
      <Link
        href="/panel/estudiantes"
        className="text-sm text-brand-600 hover:underline"
      >
        ← Volver a expedientes
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-800">
            {student.fullName}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[student.status]}`}
          >
            {STATUS_LABELS[student.status]}
          </span>
        </div>
        {canEdit && !editing && (
          <div className="flex flex-wrap gap-2">
            {user?.role === "ADMIN" && (
              <button
                onClick={() => void crearAccesoPortal()}
                disabled={portalBusy}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              >
                {portalBusy
                  ? "Procesando…"
                  : student.portalUser
                    ? "Restablecer contraseña"
                    : "Crear acceso al portal"}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowPlan(true)}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Generar plan de cuotas
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Editar datos
            </button>
          </div>
        )}
      </div>

      {showPlan && (
        <CuotaPlanModal
          studentId={id}
          onClose={() => setShowPlan(false)}
          onDone={() => {
            setShowPlan(false);
            setPagosRefresh((x) => x + 1);
          }}
        />
      )}

      {student.portalUser && !portalCreds && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="text-gray-700">
            <span className="font-medium text-gray-800">Acceso al Campus:</span>{" "}
            este estudiante ya tiene cuenta. Usuario:{" "}
            <code className="rounded bg-white px-2 py-0.5 text-xs">
              {student.portalUser.email}
            </code>
            {!student.portalUser.active && (
              <span className="ml-2 text-red-600">(cuenta desactivada)</span>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            La contraseña no se puede consultar (se guarda cifrada). Si el
            estudiante la olvidó, usa “Restablecer contraseña”.
          </p>
        </div>
      )}

      {portalCreds && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="mb-2 font-medium text-emerald-800">
            {portalCreds.reset
              ? "✓ Contraseña restablecida. Estas son las credenciales del estudiante para entrar al Campus:"
              : "✓ Cuenta creada. Estas son las credenciales del estudiante para entrar al Campus:"}
          </p>
          <div className="mb-2 grid gap-1 text-gray-700">
            <div>
              <span className="text-gray-500">Usuario (correo):</span>{" "}
              <code className="rounded bg-white px-2 py-0.5 text-xs">{portalCreds.email}</code>
            </div>
            <div>
              <span className="text-gray-500">Contraseña por defecto:</span>{" "}
              <code className="rounded bg-white px-2 py-0.5 text-xs">{portalCreds.defaultPassword}</code>
            </div>
          </div>
          <p className="mb-2 text-xs text-gray-500">
            El estudiante puede cambiar su contraseña desde el portal (Cambiar contraseña).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                void navigator.clipboard.writeText(
                  `Usuario: ${portalCreds.email}\nContraseña: ${portalCreds.defaultPassword}`
                )
              }
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Copiar credenciales
            </button>
            <button onClick={() => setPortalCreds(null)} className="text-xs text-gray-500 hover:underline">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancelar edición
            </button>
          </div>
          <StudentForm
            initial={toFormValues(student)}
            submitLabel="Guardar cambios"
            onSubmit={saveEdit}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <InfoCard student={student} />
            {canPagos && (
              <CuotasCard
                studentId={id}
                canEdit={canPagosEdit}
                refreshKey={pagosRefresh}
                onGenerar={() => setShowPlan(true)}
              />
            )}
            <ChecklistCard studentId={id} canEdit={canEdit} />
            <DocumentsCard
              student={student}
              canEdit={canEdit}
              onChange={load}
            />
          </div>
          <div className="space-y-6">
            {canEdit && <StatusCard student={student} onChange={load} />}
            <HistoryCard student={student} />
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams requiere un limite de Suspense en exportacion estatica.
export default function StudentDetailPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Cargando…</p>}>
      <StudentDetailInner />
    </Suspense>
  );
}

const CHARGE_METHODS: PaymentMethod[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "DEPOSITO",
  "TARJETA",
];

function chargeEstado(c: StudentAccount["charges"][number]) {
  if (c.status === "ANULADO")
    return { label: "Anulado", cls: "border-gray-200 bg-gray-50 text-gray-400" };
  if (c.status === "PAGADO" || c.saldo <= 0)
    return { label: "Pagado", cls: "border-green-200 bg-green-50 text-green-700" };
  if (c.overdue)
    return { label: "Vencido", cls: "border-red-200 bg-red-50 text-red-700" };
  if (c.paid > 0)
    return { label: "Parcial", cls: "border-blue-200 bg-blue-50 text-blue-700" };
  return { label: "Pendiente", cls: "border-gray-200 bg-gray-50 text-gray-500" };
}

function CuotasCard({
  studentId,
  canEdit,
  refreshKey,
  onGenerar,
}: {
  studentId: string;
  canEdit: boolean;
  refreshKey: number;
  onGenerar: () => void;
}) {
  const [data, setData] = useState<StudentAccount | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setData(await api<StudentAccount>(`/api/charges/student/${studentId}`));
  }, [studentId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const charges = data
    ? [...data.charges].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
    : [];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-brand-800">Estado de cuenta (cuotas)</h2>
        {data && data.charges.length > 0 && (
          <span className="text-sm text-gray-500">
            Pagado {formatGTQ(data.summary.totalPaid)} · Saldo{" "}
            {formatGTQ(data.summary.totalDue)}
          </span>
        )}
      </div>

      {!data ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : charges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm text-gray-500">
            Este estudiante aún no tiene un plan de cuotas.
          </p>
          {canEdit && (
            <button
              onClick={onGenerar}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Generar plan de cuotas
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {charges.map((c) => {
            const est = chargeEstado(c);
            const pagable = canEdit && c.status === "PENDIENTE" && c.saldo > 0;
            return (
              <li key={c.id} className="py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {c.concept}
                    </p>
                    <p className="text-xs text-gray-400">
                      Vence: {c.dueDate.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold text-gray-800">
                      {formatGTQ(c.amount)}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${est.cls}`}
                    >
                      {est.label}
                    </span>
                  </div>
                  {pagable && (
                    <button
                      onClick={() => setPayFor(payFor === c.id ? null : c.id)}
                      className="shrink-0 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                    >
                      {payFor === c.id ? "Cerrar" : "Registrar pago"}
                    </button>
                  )}
                </div>

                {pagable && payFor === c.id && (
                  <RegistrarPagoInline
                    studentId={studentId}
                    charge={c}
                    onDone={async () => {
                      setPayFor(null);
                      await reload();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RegistrarPagoInline({
  studentId,
  charge,
  onDone,
}: {
  studentId: string;
  charge: StudentAccount["charges"][number];
  onDone: () => void | Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState(String(charge.saldo));
  const [method, setMethod] = useState<PaymentMethod>("EFECTIVO");
  const [paidAt, setPaidAt] = useState(today);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/payments", {
        method: "POST",
        body: {
          studentId,
          chargeId: charge.id,
          concept: charge.concept,
          amount: Number(amount) || 0,
          method,
          paidAt,
        },
      });
      await onDone();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo registrar el pago");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3"
    >
      <label className="text-xs">
        <span className="mb-1 block text-gray-500">Monto (Q)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs">
        <span className="mb-1 block text-gray-500">Método</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          {CHARGE_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs">
        <span className="mb-1 block text-gray-500">Fecha</span>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}

function ChecklistCard({
  studentId,
  canEdit,
}: {
  studentId: string;
  canEdit: boolean;
}) {
  const [data, setData] = useState<StudentChecklist | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<{ id: string; value: string } | null>(
    null
  );

  const reload = useCallback(async () => {
    setData(await api<StudentChecklist>(`/api/doc-checklist/student/${studentId}`));
  }, [studentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function setStatus(
    requirementId: string,
    delivered: boolean,
    notes: string
  ) {
    setSavingId(requirementId);
    try {
      const r = await api<StudentChecklist>(
        `/api/doc-checklist/student/${studentId}/${requirementId}`,
        { method: "PUT", body: { delivered, notes: notes || null } }
      );
      setData(r);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">Documentación (checklist)</h2>
        {data && (
          <span className="text-sm text-gray-500">
            {data.entregados}/{data.total} entregados
          </span>
        )}
      </div>

      {!data ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-gray-400">
          No hay documentos configurados.{" "}
          <Link
            href="/panel/documentos-requeridos"
            className="text-brand-600 hover:underline"
          >
            Configurar
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.items.map((it) => (
            <li key={it.requirementId} className="py-2.5">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={it.delivered}
                  disabled={!canEdit || savingId === it.requirementId}
                  onChange={(e) =>
                    void setStatus(it.requirementId, e.target.checked, it.notes)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      it.delivered ? "text-gray-800" : "text-gray-600"
                    }`}
                  >
                    {it.name}
                  </p>
                  {it.notes && (
                    <p className="text-xs text-gray-400">{it.notes}</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() =>
                      setEditNotes({ id: it.requirementId, value: it.notes })
                    }
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Nota
                  </button>
                )}
              </div>

              {editNotes?.id === it.requirementId && (
                <div className="mt-2 flex gap-2 pl-7">
                  <input
                    value={editNotes.value}
                    onChange={(e) =>
                      setEditNotes({ id: it.requirementId, value: e.target.value })
                    }
                    placeholder="Observación (opcional)"
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={async () => {
                      await setStatus(
                        it.requirementId,
                        it.delivered,
                        editNotes.value
                      );
                      setEditNotes(null);
                    }}
                    className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditNotes(null)}
                    className="text-xs text-gray-500"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CuotaPlanModal({
  studentId,
  onClose,
  onDone,
}: {
  studentId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [items, setItems] = useState<CuotaPlanItem[] | null>(null);
  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: CuotaPlanItem[] }>("/api/charges/plan-template")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  const total = (items ?? []).reduce((s, it) => s + it.amount, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ created: number }>(
        `/api/charges/student/${studentId}/plan`,
        { method: "POST", body: { startMonth } }
      );
      alert(`Plan aplicado: ${r.created} cuota(s) creadas.`);
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo aplicar el plan"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-brand-800">
          Aplicar plan de cuotas
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Se crearán las cuotas del{" "}
          <Link
            href="/panel/plan-cuotas"
            className="text-brand-600 hover:underline"
          >
            plan general
          </Link>{" "}
          para este estudiante. Solo elige el mes de inicio.
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Mes de inicio</span>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {/* Vista previa del plan general */}
          {items === null ? (
            <p className="text-sm text-gray-400">Cargando plan…</p>
          ) : items.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              El plan general está vacío.{" "}
              <Link href="/panel/plan-cuotas" className="underline">
                Configúralo aquí
              </Link>
              .
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200">
              <ul className="divide-y divide-gray-100 text-sm">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between px-3 py-1.5"
                  >
                    <span className="text-gray-700">{it.concept}</span>
                    <span className="text-gray-500">{formatGTQ(it.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Total del plan:{" "}
            <span className="font-semibold text-gray-800">
              {formatGTQ(total)}
            </span>{" "}
            en {items?.length ?? 0} cuota(s).
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || (items?.length ?? 0) === 0}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Aplicando…" : "Aplicar plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}

function InfoCard({ student }: { student: StudentDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Datos personales</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="DPI" value={student.dpi} />
        <Field
          label="Fecha de nacimiento"
          value={student.birthDate?.slice(0, 10)}
        />
        <Field label="Departamento" value={student.department} />
        <Field label="Municipio" value={student.municipality} />
        <Field label="Dirección" value={student.address} />
        <Field label="Teléfono principal" value={student.phonePrimary} />
        <Field label="Teléfono alternativo" value={student.phoneAlt} />
        <Field label="Correo" value={student.email} />
        <Field
          label="Fecha de inscripción"
          value={student.enrollmentDate.slice(0, 10)}
        />
      </dl>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-800">
        Personas responsables
      </h3>
      {student.guardians.length === 0 ? (
        <p className="text-sm text-gray-400">Sin responsables registrados.</p>
      ) : (
        <ul className="space-y-2">
          {student.guardians.map((g) => (
            <li
              key={g.id}
              className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
            >
              <span className="font-medium">{g.name}</span>
              {g.relationship && ` · ${g.relationship}`}
              {g.phone && ` · ${g.phone}`}
              {g.email && ` · ${g.email}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocumentsCard({
  student,
  canEdit,
  onChange,
}: {
  student: StudentDetail;
  canEdit: boolean;
  onChange: () => Promise<void>;
}) {
  const [type, setType] = useState<DocumentType>("DPI");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      // Sube al backend (optimiza imagenes) y registra la referencia.
      const uploaded = await uploadFile(file);
      await api(`/api/students/${student.id}/documents`, {
        method: "POST",
        body: {
          type,
          fileName: uploaded.name,
          fileUrl: uploaded.url,
          fileKey: uploaded.key,
        },
      });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // permite volver a subir el mismo archivo
    }
  }

  async function remove(docId: string) {
    await api(`/api/students/${student.id}/documents/${docId}`, {
      method: "DELETE",
    });
    await onChange();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Documentos digitales</h2>

      {student.documents.length === 0 ? (
        <p className="text-sm text-gray-400">Sin documentos adjuntos.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {student.documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <p className="font-medium text-gray-800">
                  {DOC_TYPE_LABELS[d.type]}
                </p>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {d.fileName}
                </a>
              </div>
              {canEdit && (
                <button
                  onClick={() => void remove(d.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Selecciona el tipo y sube el archivo (PDF o imagen, máx. 8MB).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              disabled={isUploading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <label
              className={`flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
                isUploading
                  ? "cursor-not-allowed bg-brand-400"
                  : "bg-brand-600 hover:bg-brand-700"
              }`}
            >
              {isUploading ? "Subiendo…" : "Subir documento"}
              <input
                type="file"
                accept="application/pdf,image/*"
                disabled={isUploading}
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}

function StatusCard({
  student,
  onChange,
}: {
  student: StudentDetail;
  onChange: () => Promise<void>;
}) {
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/students/${student.id}/status`, {
        method: "POST",
        body: { status, reason },
      });
      setReason("");
      await onChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">Cambiar estado</h2>
      <form onSubmit={save} className="space-y-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StudentStatus)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Motivo del cambio (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || status === student.status}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Actualizar estado"}
        </button>
      </form>
    </section>
  );
}

function HistoryCard({ student }: { student: StudentDetail }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-brand-800">
        Historial de estados
      </h2>
      <ol className="space-y-3">
        {student.statusHistory.map((h) => (
          <li key={h.id} className="border-l-2 border-brand-200 pl-3">
            <p className="text-sm font-medium text-gray-800">
              {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ""}
              {STATUS_LABELS[h.toStatus]}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(h.createdAt).toLocaleString("es-GT")}
              {h.changedBy ? ` · ${h.changedBy.name}` : ""}
            </p>
            {h.reason && (
              <p className="mt-1 text-xs text-gray-500">{h.reason}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
