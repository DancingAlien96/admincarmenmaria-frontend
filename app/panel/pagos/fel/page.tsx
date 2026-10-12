"use client";

// Recibos electrónicos (FEL): listado de recibos emitidos y, para el admin,
// la configuración del emisor (datos de SAT, establecimientos y frases).

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, FEL_STATUS_LABELS, FEL_STATUS_STYLES, formatGTQ } from "@/lib/labels";
import type { FelConfig, FelEstablishment, FelStatus, FelStatusInfo, FelReceipt, Pagination } from "@/lib/types";
import { fmtFechaHora, invalidateFelStatus, ReciboModal } from "@/components/fel-recibo";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

export default function FelPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "PAYMENTS", "EDITOR");
  const isAdmin = user?.role === "ADMIN";
  const [tab, setTab] = useState<"recibos" | "config">("recibos");
  const [estado, setEstado] = useState<FelStatusInfo | null>(null);
  // Se incrementa para volver a consultar el estado (tras guardar la configuración)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    api<FelStatusInfo>("/api/fel/status")
      .then((r) => {
        if (activo) setEstado(r);
      })
      .catch(() => {
        if (activo) setEstado(null);
      });
    return () => {
      activo = false;
    };
  }, [version]);

  const loadEstado = useCallback(async () => setVersion((v) => v + 1), []);

  return (
    <div>
      <Link href="/panel/pagos" className="text-sm text-brand-600 hover:underline">
        <ArrowLeft aria-hidden className="mr-1 inline h-4 w-4 align-[-3px]" />Volver a pagos
      </Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Recibos electrónicos (FEL)</h1>
          <p className="text-sm text-gray-500">
            Recibos certificados ante la SAT a través de Digifact.
          </p>
        </div>
        {isAdmin && (
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
            <button
              onClick={() => setTab("recibos")}
              className={`rounded-md px-3 py-1.5 ${tab === "recibos" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Recibos
            </button>
            <button
              onClick={() => setTab("config")}
              className={`rounded-md px-3 py-1.5 ${tab === "config" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Configuración
            </button>
          </div>
        )}
      </div>

      <EstadoBanner estado={estado} isAdmin={isAdmin} onConfigurar={() => setTab("config")} />

      {tab === "recibos" ? (
        <RecibosList canEdit={canEdit} />
      ) : (
        <ConfigForm
          onSaved={async () => {
            invalidateFelStatus();
            await loadEstado();
          }}
        />
      )}
    </div>
  );
}

function EstadoBanner({
  estado,
  isAdmin,
  onConfigurar,
}: {
  estado: FelStatusInfo | null;
  isAdmin: boolean;
  onConfigurar: () => void;
}) {
  if (!estado) return null;
  if (!estado.configured) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Digifact no está configurado en el servidor (faltan las credenciales DIGIFACT_*). Mientras tanto no se pueden emitir recibos.
      </div>
    );
  }
  if (!estado.enabled) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <span>La emisión de recibos está <strong>desactivada</strong>.</span>
        {isAdmin && (
          <button onClick={onConfigurar} className="text-brand-700 hover:underline">
            Activar en la configuración
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span>
        Emisión <strong>activa</strong> · NIT emisor {estado.issuerNit}
      </span>
      <span>
        Ambiente:{" "}
        <strong className={estado.environment === "test" ? "text-amber-700" : ""}>
          {estado.environment === "test" ? "PRUEBAS (sin validez fiscal)" : "producción"}
        </strong>
      </span>
      <span>Automático al aplicar pagos: <strong>{estado.autoIssue ? "sí" : "no"}</strong></span>
    </div>
  );
}

// --- Listado -------------------------------------------------------------------

function RecibosList({ canEdit }: { canEdit: boolean }) {
  const [estadoFiltro, setEstadoFiltro] = useState<FelStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FelReceipt[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [totalCertificado, setTotalCertificado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verId, setVerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFiltro) params.set("status", estadoFiltro);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      const r = await api<{
        data: FelReceipt[];
        pagination: Pagination;
        totals: { certified: number };
      }>(`/api/fel/receipts?${params.toString()}`);
      setItems(r.data);
      setPagination(r.pagination);
      setTotalCertificado(r.totals.certified);
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, search, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value as FelStatus | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="CERTIFIED">Certificados</option>
          <option value="ERROR">Con error</option>
          <option value="VOIDED">Anulados</option>
          <option value="PENDING">En proceso</option>
        </select>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por autorización, número, NIT o nombre"
          className="min-w-[260px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <span className="ml-auto text-sm text-gray-500">
          Total certificado (filtro): <strong className="text-gray-800">{formatGTQ(totalCertificado)}</strong>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Serie · Número</th>
              <th className="px-4 py-3">Receptor</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay recibos que coincidan.</td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className={r.status === "VOIDED" ? "opacity-60" : ""}>
                  <td className="px-4 py-3 text-gray-600">{fmtFechaHora(r.certifiedAt ?? r.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {r.series && r.number ? `${r.series} · ${r.number}` : "—"}
                    {r.authorizationNumber && (
                      <span className="block max-w-[220px] truncate text-[10px] text-gray-400" title={r.authorizationNumber}>
                        {r.authorizationNumber}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {r.receiverName}
                    <span className="block text-xs text-gray-400">
                      {r.receiverTaxIdType === "CUI" ? "CUI" : "NIT"} {r.receiverTaxId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.payment.concept}
                    {r.payment.student && (
                      <Link
                        href={`/panel/estudiantes/detalle?id=${r.payment.student.id}`}
                        className="block text-xs text-brand-700 hover:underline"
                      >
                        {r.payment.student.fullName}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{formatGTQ(r.grandTotal)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FEL_STATUS_STYLES[r.status]}`} title={r.error ?? undefined}>
                      {FEL_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setVerId(r.id)} className="text-xs text-brand-600 hover:underline">
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {pagination.page} de {pagination.totalPages} · {pagination.total} recibos
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50">
              Anterior
            </button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-50">
              Siguiente
            </button>
          </div>
        </div>
      )}

      {verId && (
        <ReciboModal reciboId={verId} canEdit={canEdit} onClose={() => setVerId(null)} onChanged={load} />
      )}
    </div>
  );
}

// --- Configuración (admin) --------------------------------------------------------

function ConfigForm({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [cfg, setCfg] = useState<FelConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void api<{ config: FelConfig }>("/api/fel/config").then((r) => setCfg(r.config));
  }, []);

  if (!cfg) return <p className="text-gray-400">Cargando configuración…</p>;

  const set = <K extends keyof FelConfig>(k: K, v: FelConfig[K]) => setCfg({ ...cfg, [k]: v });
  const setIssuer = <K extends keyof FelConfig["issuer"]>(k: K, v: FelConfig["issuer"][K]) =>
    setCfg({ ...cfg, issuer: { ...cfg.issuer, [k]: v } });
  // Garantiza exactamente un establecimiento predeterminado: si ninguno (o más
  // de uno) está marcado, queda el primero marcado.
  const setEstablishments = (list: FelEstablishment[]) => {
    const found = list.findIndex((e) => e.isDefault);
    const def = found === -1 ? 0 : found;
    set("establishments", list.map((e, j) => ({ ...e, isDefault: j === def })));
  };
  const setEst = (i: number, patch: Partial<FelEstablishment>) =>
    setEstablishments(cfg.establishments.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const setDefaultEst = (i: number) =>
    set("establishments", cfg.establishments.map((e, j) => ({ ...e, isDefault: j === i })));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const r = await api<{ config: FelConfig }>("/api/fel/config", { method: "PUT", body: cfg });
      setCfg(r.config);
      setMsg({ ok: true, text: "Configuración guardada." });
      await onSaved();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "No se pudo guardar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "border border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-brand-800">Emisión</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle
            checked={cfg.enabled}
            onChange={(v) => set("enabled", v)}
            label="Permitir emitir recibos"
            hint="Muestra el botón «Emitir recibo FEL» en los pagos."
          />
          <Toggle
            checked={cfg.autoIssue}
            onChange={(v) => set("autoIssue", v)}
            label="Emitir al aplicar un pago"
            hint="Registro manual, boleta aprobada o tarjeta confirmada. El correo de confirmación lleva el DTE y su QR."
          />
          <Toggle
            checked={cfg.sendEmail}
            onChange={(v) => set("sendEmail", v)}
            label="Correo al emitir a mano"
            hint="Envía el recibo al correo del receptor cuando se emite desde el panel."
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-brand-800">Emisor (datos registrados en SAT)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>NIT</label>
            <input className={inputClass} value={cfg.issuer.nit} onChange={(e) => setIssuer("nit", e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Afiliación IVA</label>
            <select className={inputClass} value={cfg.issuer.taxAffiliation} onChange={(e) => setIssuer("taxAffiliation", e.target.value as FelConfig["issuer"]["taxAffiliation"])}>
              <option value="GEN">GEN · General</option>
              <option value="PEQ">PEQ · Pequeño contribuyente</option>
              <option value="EXE">EXE · Exento</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre / razón social (NombreEmisor)</label>
            <input className={inputClass} value={cfg.issuer.name} onChange={(e) => setIssuer("name", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre comercial</label>
            <input className={inputClass} value={cfg.issuer.commercialName} onChange={(e) => setIssuer("commercialName", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Correo del emisor (opcional)</label>
            <input type="email" className={inputClass} value={cfg.issuer.email} onChange={(e) => setIssuer("email", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brand-800">Establecimientos</h2>
            <p className="text-xs text-gray-500">
              Uno por sede. El recibo usa el establecimiento de la sede del pago o del alumno; si no coincide, el marcado como predeterminado.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEstablishments([
                ...cfg.establishments,
                {
                  code: "",
                  commercialName: cfg.issuer.commercialName,
                  sede: "",
                  address: "",
                  postalCode: "",
                  municipality: "",
                  department: "",
                  isDefault: cfg.establishments.length === 0,
                },
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
        <div className="space-y-3">
          {cfg.establishments.map((e, i) => (
            <div key={e.id ?? `nuevo-${i}`} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <div>
                  <label className={labelClass}>Código SAT</label>
                  <input className={inputClass} value={e.code} onChange={(ev) => setEst(i, { code: ev.target.value })} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Sede del sistema</label>
                  <input className={inputClass} value={e.sede ?? ""} onChange={(ev) => setEst(i, { sede: ev.target.value })} placeholder="Chiquimula / Morales Izabal" />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Nombre comercial</label>
                  <input className={inputClass} value={e.commercialName} onChange={(ev) => setEst(i, { commercialName: ev.target.value })} required />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Dirección</label>
                  <input className={inputClass} value={e.address} onChange={(ev) => setEst(i, { address: ev.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Código postal</label>
                  <input className={inputClass} value={e.postalCode} onChange={(ev) => setEst(i, { postalCode: ev.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Municipio</label>
                  <input className={inputClass} value={e.municipality} onChange={(ev) => setEst(i, { municipality: ev.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Departamento</label>
                  <input className={inputClass} value={e.department} onChange={(ev) => setEst(i, { department: ev.target.value })} required />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label
                  className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-700"
                  title="Se usa cuando la sede del pago no coincide con ningún establecimiento"
                >
                  <input
                    type="radio"
                    name="fel-establecimiento-predeterminado"
                    checked={e.isDefault}
                    onChange={() => setDefaultEst(i)}
                  />
                  Predeterminado
                </label>
                {cfg.establishments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setEstablishments(cfg.establishments.filter((_, j) => j !== i))}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" /> Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brand-800">Frases SAT</h2>
            <p className="text-xs text-gray-500">
              Tipo 8 / escenario 2: exenta del ISR (centros educativos privados). Tipo 4 / escenario 8: exenta del IVA (cuotas de centros educativos).
            </p>
          </div>
          <button
            type="button"
            onClick={() => set("phrases", [...cfg.phrases, { phraseType: 1, scenarioCode: 1 }])}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {cfg.phrases.map((f, i) => (
            <div key={i} className="flex items-end gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
              <div>
                <label className={labelClass}>Tipo</label>
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  value={f.phraseType}
                  onChange={(e) => set("phrases", cfg.phrases.map((x, j) => (j === i ? { ...x, phraseType: Number(e.target.value) } : x)))}
                />
              </div>
              <div>
                <label className={labelClass}>Escenario</label>
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  value={f.scenarioCode}
                  onChange={(e) => set("phrases", cfg.phrases.map((x, j) => (j === i ? { ...x, scenarioCode: Number(e.target.value) } : x)))}
                />
              </div>
              {cfg.phrases.length > 1 && (
                <button type="button" onClick={() => set("phrases", cfg.phrases.filter((_, j) => j !== i))} className="pb-2 text-red-600" aria-label="Quitar frase">
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );
}
