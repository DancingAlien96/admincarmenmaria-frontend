"use client";

// Recibos electrónicos (FEL): listado de recibos emitidos y, para el admin,
// la configuración del emisor (datos de SAT, establecimientos y frases).

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canAccess, FEL_ESTADO_LABELS, FEL_ESTADO_STYLES, formatGTQ } from "@/lib/labels";
import type { FelConfig, FelEstado, FelEstadoInfo, FelRecibo, Pagination } from "@/lib/types";
import { fmtFechaHora, invalidarFelEstado, ReciboModal } from "@/components/fel-recibo";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

export default function FelPage() {
  const { user } = useAuth();
  const canEdit = canAccess(user, "PAYMENTS", "EDITOR");
  const isAdmin = user?.role === "ADMIN";
  const [tab, setTab] = useState<"recibos" | "config">("recibos");
  const [estado, setEstado] = useState<FelEstadoInfo | null>(null);
  // Se incrementa para volver a consultar el estado (tras guardar la configuración)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    api<FelEstadoInfo>("/api/fel/estado")
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
            invalidarFelEstado();
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
  estado: FelEstadoInfo | null;
  isAdmin: boolean;
  onConfigurar: () => void;
}) {
  if (!estado) return null;
  if (!estado.configurado) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Digifact no está configurado en el servidor (faltan las credenciales DIGIFACT_*). Mientras tanto no se pueden emitir recibos.
      </div>
    );
  }
  if (!estado.habilitado) {
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
        Emisión <strong>activa</strong> · NIT emisor {estado.emisorNit}
      </span>
      <span>
        Ambiente:{" "}
        <strong className={estado.ambiente === "pruebas" ? "text-amber-700" : ""}>
          {estado.ambiente === "pruebas" ? "PRUEBAS (sin validez fiscal)" : "producción"}
        </strong>
      </span>
      <span>Automático al aplicar pagos: <strong>{estado.emitirAutomatico ? "sí" : "no"}</strong></span>
    </div>
  );
}

// --- Listado -------------------------------------------------------------------

function RecibosList({ canEdit }: { canEdit: boolean }) {
  const [estadoFiltro, setEstadoFiltro] = useState<FelEstado | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FelRecibo[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [totalCertificado, setTotalCertificado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verId, setVerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFiltro) params.set("estado", estadoFiltro);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      const r = await api<{
        data: FelRecibo[];
        pagination: Pagination;
        totales: { certificado: number };
      }>(`/api/fel/recibos?${params.toString()}`);
      setItems(r.data);
      setPagination(r.pagination);
      setTotalCertificado(r.totales.certificado);
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
            setEstadoFiltro(e.target.value as FelEstado | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="CERTIFICADO">Certificados</option>
          <option value="ERROR">Con error</option>
          <option value="ANULADO">Anulados</option>
          <option value="PENDIENTE">En proceso</option>
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
                <tr key={r.id} className={r.estado === "ANULADO" ? "opacity-60" : ""}>
                  <td className="px-4 py-3 text-gray-600">{fmtFechaHora(r.fechaCertificacion ?? r.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {r.serie && r.numero ? `${r.serie} · ${r.numero}` : "—"}
                    {r.autorizacion && (
                      <span className="block max-w-[220px] truncate text-[10px] text-gray-400" title={r.autorizacion}>
                        {r.autorizacion}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {r.receptorNombre}
                    <span className="block text-xs text-gray-400">
                      {r.receptorTipo === "CUI" ? "CUI" : "NIT"} {r.receptorId}
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
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{formatGTQ(r.granTotal)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FEL_ESTADO_STYLES[r.estado]}`} title={r.error ?? undefined}>
                      {FEL_ESTADO_LABELS[r.estado]}
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
  const setEmisor = <K extends keyof FelConfig["emisor"]>(k: K, v: FelConfig["emisor"][K]) =>
    setCfg({ ...cfg, emisor: { ...cfg.emisor, [k]: v } });
  const setEst = (i: number, patch: Partial<FelConfig["establecimientos"][number]>) =>
    setCfg({
      ...cfg,
      establecimientos: cfg.establecimientos.map((e, j) => (j === i ? { ...e, ...patch } : e)),
    });

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
            checked={cfg.habilitado}
            onChange={(v) => set("habilitado", v)}
            label="Permitir emitir recibos"
            hint="Muestra el botón «Emitir recibo FEL» en los pagos."
          />
          <Toggle
            checked={cfg.emitirAutomatico}
            onChange={(v) => set("emitirAutomatico", v)}
            label="Emitir al aplicar un pago"
            hint="Registro manual, boleta aprobada o tarjeta confirmada. El correo de confirmación lleva el DTE y su QR."
          />
          <Toggle
            checked={cfg.enviarCorreo}
            onChange={(v) => set("enviarCorreo", v)}
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
            <input className={inputClass} value={cfg.emisor.nit} onChange={(e) => setEmisor("nit", e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Afiliación IVA</label>
            <select className={inputClass} value={cfg.emisor.afiliacionIva} onChange={(e) => setEmisor("afiliacionIva", e.target.value as FelConfig["emisor"]["afiliacionIva"])}>
              <option value="GEN">GEN · General</option>
              <option value="PEQ">PEQ · Pequeño contribuyente</option>
              <option value="EXE">EXE · Exento</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre / razón social (NombreEmisor)</label>
            <input className={inputClass} value={cfg.emisor.nombre} onChange={(e) => setEmisor("nombre", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre comercial</label>
            <input className={inputClass} value={cfg.emisor.nombreComercial} onChange={(e) => setEmisor("nombreComercial", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Correo del emisor (opcional)</label>
            <input type="email" className={inputClass} value={cfg.emisor.correo} onChange={(e) => setEmisor("correo", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-brand-800">Establecimientos</h2>
            <p className="text-xs text-gray-500">
              Uno por sede. El recibo usa el establecimiento de la sede del pago o del alumno; si no coincide, el primero.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              set("establecimientos", [
                ...cfg.establecimientos,
                { codigo: "", nombre: cfg.emisor.nombreComercial, sede: "", direccion: "", codigoPostal: "", municipio: "", departamento: "" },
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
        <div className="space-y-3">
          {cfg.establecimientos.map((e, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <div>
                  <label className={labelClass}>Código SAT</label>
                  <input className={inputClass} value={e.codigo} onChange={(ev) => setEst(i, { codigo: ev.target.value })} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Sede del sistema</label>
                  <input className={inputClass} value={e.sede ?? ""} onChange={(ev) => setEst(i, { sede: ev.target.value })} placeholder="Chiquimula / Morales Izabal" />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Nombre comercial</label>
                  <input className={inputClass} value={e.nombre} onChange={(ev) => setEst(i, { nombre: ev.target.value })} required />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Dirección</label>
                  <input className={inputClass} value={e.direccion} onChange={(ev) => setEst(i, { direccion: ev.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Código postal</label>
                  <input className={inputClass} value={e.codigoPostal} onChange={(ev) => setEst(i, { codigoPostal: ev.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Municipio</label>
                  <input className={inputClass} value={e.municipio} onChange={(ev) => setEst(i, { municipio: ev.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Departamento</label>
                  <input className={inputClass} value={e.departamento} onChange={(ev) => setEst(i, { departamento: ev.target.value })} required />
                </div>
              </div>
              {cfg.establecimientos.length > 1 && (
                <button
                  type="button"
                  onClick={() => set("establecimientos", cfg.establecimientos.filter((_, j) => j !== i))}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                >
                  <Trash2 aria-hidden className="h-3.5 w-3.5" /> Quitar
                </button>
              )}
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
            onClick={() => set("frases", [...cfg.frases, { tipo: 1, escenario: 1 }])}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {cfg.frases.map((f, i) => (
            <div key={i} className="flex items-end gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
              <div>
                <label className={labelClass}>Tipo</label>
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  value={f.tipo}
                  onChange={(e) => set("frases", cfg.frases.map((x, j) => (j === i ? { ...x, tipo: Number(e.target.value) } : x)))}
                />
              </div>
              <div>
                <label className={labelClass}>Escenario</label>
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  value={f.escenario}
                  onChange={(e) => set("frases", cfg.frases.map((x, j) => (j === i ? { ...x, escenario: Number(e.target.value) } : x)))}
                />
              </div>
              {cfg.frases.length > 1 && (
                <button type="button" onClick={() => set("frases", cfg.frases.filter((_, j) => j !== i))} className="pb-2 text-red-600" aria-label="Quitar frase">
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
