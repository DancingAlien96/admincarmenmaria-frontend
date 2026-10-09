"use client";

import { Award, Brain, Check, ClipboardList, FileText, FlaskConical, Heart, Library, Star, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { type FaseContentItem, type FaseItemKind } from "@/lib/types";

const FASES = [
  { fase: 1, nombre: "Fase I", subtitulo: "Fundamentos Básicos" },
  { fase: 2, nombre: "Fase II", subtitulo: "Fundamentos Clínicos" },
  { fase: 3, nombre: "Fase III", subtitulo: "Práctica Supervisada" },
];

const SECCIONES: { kind: FaseItemKind; titulo: string; icon: LucideIcon }[] = [
  { kind: "TAREA", titulo: "Tareas", icon: ClipboardList },
  { kind: "ACTIVIDAD", titulo: "Actividades", icon: FlaskConical },
  { kind: "EXAMEN", titulo: "Exámenes", icon: FileText },
  { kind: "MATERIAL", titulo: "Materiales", icon: Library },
];

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Contenido de clase por fase (tareas, actividades, exámenes, materiales y
// Reto de Comprensión). Lo crea el administrador; el docente lo consulta
// (readOnly) y solo pone las calificaciones.
export function FasesManager({
  intro,
  readOnly = false,
}: {
  intro: string;
  readOnly?: boolean;
}) {
  const [fase, setFase] = useState(1);
  const [items, setItems] = useState<FaseContentItem[] | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ items: FaseContentItem[] }>("/api/fase-content");
    setItems(r.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const delItem = async (id: string) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    try {
      await api(`/api/fase-content/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  };

  const actual = FASES.find((f) => f.fase === fase)!;
  const delFase = (items ?? []).filter((i) => i.fase === fase);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-brand-800 sm:text-2xl">
        Gestión de Fases
      </h1>
      <p className="mb-5 text-sm text-gray-500">{intro}</p>

      <Criterios readOnly={readOnly} />

      {/* Tabs de fase */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FASES.map((f) => (
          <button
            key={f.fase}
            onClick={() => setFase(f.fase)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              fase === f.fase
                ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.nombre}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-gray-500">
        <span className="font-semibold text-brand-800">{actual.nombre}</span> ·{" "}
        {actual.subtitulo}
      </p>

      {items && <Ponderacion items={delFase} />}

      {!items ? (
        <p className="text-gray-400">Cargando…</p>
      ) : (
        <div className="space-y-5">
          {SECCIONES.map((sec) => (
            <SeccionCard
              key={sec.kind}
              fase={fase}
              kind={sec.kind}
              titulo={sec.titulo}
              icon={sec.icon}
              items={delFase.filter((i) => i.kind === sec.kind)}
              onChange={load}
              onDelete={delItem}
              readOnly={readOnly}
            />
          ))}
          <RetoManager key={`reto-${fase}`} fase={fase} readOnly={readOnly} />
          <EncuestaManager key={`enc-${fase}`} fase={fase} readOnly={readOnly} />
        </div>
      )}
    </div>
  );
}

function SeccionCard({
  fase,
  kind,
  titulo,
  icon: Icon,
  items,
  onChange,
  onDelete,
  readOnly,
}: {
  fase: number;
  kind: FaseItemKind;
  titulo: string;
  icon: LucideIcon;
  items: FaseContentItem[];
  onChange: () => void;
  onDelete: (id: string) => void;
  readOnly: boolean;
}) {
  const [adding, setAdding] = useState(false);
  // Si no es null, el formulario edita ese elemento en vez de crear uno nuevo
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [meta, setMeta] = useState("");
  // Ponderación: cuántos puntos (sobre 100) vale en la nota de la fase
  const [puntos, setPuntos] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const esMaterial = kind === "MATERIAL";

  function limpiar() {
    setTitle("");
    setDescription("");
    setDate("");
    setMeta("");
    setPuntos("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setEditId(null);
    setAdding(false);
  }

  function editar(it: FaseContentItem) {
    setEditId(it.id);
    setTitle(it.title);
    setDescription(it.description ?? "");
    setDate(it.date ? it.date.slice(0, 10) : "");
    setMeta(it.meta ?? "");
    setPuntos(it.puntos ? String(it.puntos) : "");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setAdding(true);
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    // Al editar un material, el archivo nuevo es opcional (se conserva el actual)
    if (esMaterial && !file && !editId) {
      alert("Sube el archivo del material.");
      return;
    }
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      let fileKey: string | undefined;
      let size: string | undefined;
      if (esMaterial && file) {
        const up = await uploadFile(file);
        fileUrl = up.url;
        fileKey = up.key;
        size = sizeLabel(up.size);
      }
      const body = {
        title,
        description,
        date: date || null,
        meta: meta || null,
        ...(esMaterial ? {} : { puntos: puntos === "" ? null : Number(puntos) }),
        fileUrl,
        fileKey,
        sizeLabel: size,
      };
      if (editId) {
        await api(`/api/fase-content/${editId}`, { method: "PATCH", body });
      } else {
        await api("/api/fase-content", {
          method: "POST",
          body: { fase, kind, ...body },
        });
      }
      limpiar();
      onChange();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-brand-800">
          <Icon aria-hidden className="h-5 w-5" />
          {titulo}
        </h2>
        {!readOnly && (
          <button
            onClick={() => (adding ? limpiar() : setAdding(true))}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {adding ? "Cerrar" : "+ Agregar"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nada publicado aún.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {it.title}
                  {!!it.puntos && (
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {it.puntos} pts
                    </span>
                  )}
                </p>
                {it.description && (
                  <p className="text-xs text-gray-500">{it.description}</p>
                )}
                <p className="text-[11px] text-gray-400">
                  {[
                    it.date ? it.date.slice(0, 10) : null,
                    it.meta,
                    it.sizeLabel,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {it.fileUrl && (
                <a
                  href={it.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline"
                >
                  Ver
                </a>
              )}
              {!readOnly && (
                <>
                  <button
                    onClick={() => editar(it)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(it.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={agregar} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {editId && (
            <p className="text-xs font-medium text-brand-700">Editando elemento</p>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className={`grid gap-2 ${esMaterial ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {!esMaterial && (
              <input
                type="number"
                min={0}
                max={100}
                value={puntos}
                onChange={(e) => setPuntos(e.target.value)}
                placeholder="Puntos (ej. 10)"
                title="Cuántos puntos vale en la nota de la fase (sobre 100)"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            )}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {!esMaterial ? (
              <input
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder={
                  kind === "EXAMEN"
                    ? "Tipo / duración (ej. Parcial · 90 min)"
                    : kind === "ACTIVIDAD"
                      ? "Tipo (práctica, taller…)"
                      : "Detalle (opcional)"
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            ) : (
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Guardando…" : editId ? "Guardar cambios" : "Guardar"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={limpiar}
              className="ml-3 text-sm text-gray-500 hover:underline"
            >
              Cancelar
            </button>
          )}
          {editId && esMaterial && (
            <p className="text-xs text-gray-500">
              Si no eliges un archivo nuevo, se conserva el actual.
            </p>
          )}
        </form>
      )}
    </section>
  );
}

// --- Reto de Comprensión (preguntas) -----------------------------------------

interface Pregunta {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

function RetoManager({ fase, readOnly }: { fase: number; readOnly: boolean }) {
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [resultados, setResultados] = useState<
    { id: string; nombre: string; intentos: number; mejor: number; aprobado: boolean }[]
  >([]);
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  // Si no es null, el formulario edita esa pregunta
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [q, r] = await Promise.all([
      api<{ preguntas: Pregunta[] }>(`/api/fase-extras/quiz?fase=${fase}`),
      api<{ alumnos: typeof resultados }>(`/api/fase-extras/quiz/resultados?fase=${fase}`),
    ]);
    setPreguntas(q.preguntas);
    setResultados(r.alumnos);
  }, [fase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editId) {
        await api(`/api/fase-extras/quiz/${editId}`, {
          method: "PATCH",
          body: { question, options, correctIndex: correct },
        });
      } else {
        await api("/api/fase-extras/quiz", {
          method: "POST",
          body: { fase, question, options, correctIndex: correct },
        });
      }
      cerrarForm();
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar la pregunta");
    } finally {
      setBusy(false);
    }
  }

  function cerrarForm() {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrect(0);
    setEditId(null);
    setAdding(false);
  }

  function editar(p: Pregunta) {
    setEditId(p.id);
    setQuestion(p.question);
    // Siempre 4 casillas como mínimo (las vacías se ignoran al guardar)
    setOptions([...p.options, "", "", "", ""].slice(0, Math.max(4, p.options.length)));
    setCorrect(p.correctIndex);
    setAdding(true);
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar esta pregunta del reto?")) return;
    await api(`/api/fase-extras/quiz/${id}`, { method: "DELETE" });
    await load();
  }

  const aprobados = resultados.filter((r) => r.aprobado).length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-brand-800">
          <Brain aria-hidden className="h-5 w-5" />
          Reto de Comprensión
        </h2>
        {!readOnly && (
          <button
            onClick={() => (adding ? cerrarForm() : setAdding(true))}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {adding ? "Cerrar" : "+ Agregar pregunta"}
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Preguntas de opción múltiple. El estudiante lo puede responder cuando
        completa la fase y aprueba con el mínimo de los Criterios de
        aprobación (intentos ilimitados). No afecta la nota, pero es requisito
        para desbloquear la siguiente fase. Si no hay preguntas, no se exige.
      </p>

      {adding && (
        <form onSubmit={guardar} className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3">
          {editId && (
            <p className="text-xs font-medium text-brand-700">Editando pregunta</p>
          )}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta"
            rows={2}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {options.map((o, k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="radio"
                name="correcta"
                checked={correct === k}
                onChange={() => setCorrect(k)}
                title="Respuesta correcta"
              />
              <input
                value={o}
                onChange={(e) =>
                  setOptions(options.map((x, i) => (i === k ? e.target.value : x)))
                }
                placeholder={`Opción ${k + 1}${k > 1 ? " (opcional)" : ""}`}
                required={k < 2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
            </label>
          ))}
          <p className="text-xs text-gray-500">Marca el círculo de la respuesta correcta.</p>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Guardando…" : editId ? "Guardar cambios" : "Guardar pregunta"}
          </button>
        </form>
      )}

      {!preguntas ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : preguntas.length === 0 ? (
        <p className="text-sm text-gray-400">Esta fase aún no tiene reto.</p>
      ) : (
        <ol className="space-y-2">
          {preguntas.map((p, i) => (
            <li key={p.id} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-800">
                  {i + 1}. {p.question}
                </p>
                {!readOnly && (
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => editar(p)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => void borrar(p.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Eliminar pregunta"
                    >
                      <X aria-hidden className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
              <ul className="mt-1 space-y-0.5 text-xs">
                {p.options.map((o, k) => (
                  <li
                    key={k}
                    className={k === p.correctIndex ? "font-medium text-green-700" : "text-gray-500"}
                  >
                    {k === p.correctIndex && (
                      <Check aria-hidden className="mr-1 inline h-3 w-3" strokeWidth={3} />
                    )}
                    {o}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {resultados.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Resultados: {aprobados} de {resultados.length} estudiante(s) aprobaron
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {resultados.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-gray-700">{r.nombre}</span>
                <span className={r.aprobado ? "text-green-700" : "text-gray-500"}>
                  {Math.round(r.mejor)}% · {r.intentos} intento(s)
                  {r.aprobado ? " · Aprobado" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// --- Encuesta de satisfacción (criterios por fase + resultados) -------------

interface CriterioEncuesta {
  id: string;
  grupo: string;
  clave: string;
  nombre: string;
  detalle: string | null;
}

interface EncuestaResumen {
  respuestas: number;
  secciones: {
    nombre: string;
    promedio: number | null;
    criterios: { clave: string; promedio: number | null; votos: number }[];
  }[];
}

function EncuestaManager({ fase, readOnly }: { fase: number; readOnly: boolean }) {
  const [criterios, setCriterios] = useState<CriterioEncuesta[] | null>(null);
  const [resumen, setResumen] = useState<EncuestaResumen | null>(null);
  const [form, setForm] = useState<{
    id: string | null;
    grupo: string;
    nombre: string;
    detalle: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([
      api<{ criterios: CriterioEncuesta[] }>(`/api/fase-extras/encuesta/criterios?fase=${fase}`),
      api<EncuestaResumen>(`/api/fase-extras/encuesta/resumen?fase=${fase}`),
    ]);
    setCriterios(c.criterios);
    setResumen(r);
  }, [fase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const body = { grupo: form.grupo, nombre: form.nombre, detalle: form.detalle || null };
      if (form.id) {
        await api(`/api/fase-extras/encuesta/criterios/${form.id}`, { method: "PATCH", body });
      } else {
        await api("/api/fase-extras/encuesta/criterios", {
          method: "POST",
          body: { fase, ...body },
        });
      }
      setForm(null);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function quitar(c: CriterioEncuesta) {
    if (!confirm(`¿Quitar "${c.nombre}" de la encuesta? Las respuestas anteriores se conservan.`)) return;
    await api(`/api/fase-extras/encuesta/criterios/${c.id}`, { method: "DELETE" });
    await load();
  }

  // Promedio por criterio (de las respuestas de los alumnos)
  const promedios = new Map<string, { promedio: number | null; votos: number }>();
  resumen?.secciones.forEach((s) => s.criterios.forEach((c) => promedios.set(c.clave, c)));
  const grupos = [...new Set((criterios ?? []).map((c) => c.grupo))];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-brand-800">
          <Heart aria-hidden className="h-5 w-5" />
          Encuesta de satisfacción
        </h2>
        {!readOnly && (
          <button
            onClick={() =>
              setForm(form ? null : { id: null, grupo: grupos[0] ?? "", nombre: "", detalle: "" })
            }
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {form ? "Cerrar" : "+ Agregar criterio"}
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Lo que los estudiantes califican con 1 a 5 estrellas en esta fase.
        {resumen ? ` ${resumen.respuestas} estudiante(s) han respondido.` : ""}
      </p>

      {form && (
        <form onSubmit={guardar} className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3">
          {form.id && <p className="text-xs font-medium text-brand-700">Editando criterio</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.grupo}
              onChange={(e) => setForm({ ...form, grupo: e.target.value })}
              list={`grupos-encuesta-${fase}`}
              placeholder="Sección (ej. Instalaciones)"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <datalist id={`grupos-encuesta-${fase}`}>
              {grupos.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Criterio (ej. Puntualidad del docente)"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={form.detalle}
            onChange={(e) => setForm({ ...form, detalle: e.target.value })}
            placeholder="Descripción breve (opcional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Guardando…" : form.id ? "Guardar cambios" : "Agregar"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!criterios ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : criterios.length === 0 ? (
        <p className="text-sm text-gray-400">
          Esta fase no tiene encuesta. Agrega criterios para que los estudiantes
          la respondan.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {grupos.map((g) => {
            const sec = resumen?.secciones.find((s) => s.nombre === g);
            return (
              <div key={g} className="rounded-lg bg-gray-50 p-3">
                <p className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800">
                  {g}
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star aria-hidden className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {sec?.promedio ?? "—"}
                  </span>
                </p>
                <ul className="space-y-2">
                  {criterios
                    .filter((c) => c.grupo === g)
                    .map((c) => {
                      const pr = promedios.get(c.clave);
                      return (
                        <li key={c.id} className="text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-gray-800">{c.nombre}</span>
                            <span className="shrink-0 text-gray-500">
                              {pr?.promedio ?? "—"}
                              {pr && pr.votos > 0 ? ` (${pr.votos})` : ""}
                            </span>
                          </div>
                          {c.detalle && <p className="text-gray-500">{c.detalle}</p>}
                          {!readOnly && (
                            <div className="mt-0.5 flex gap-3">
                              <button
                                onClick={() =>
                                  setForm({
                                    id: c.id,
                                    grupo: c.grupo,
                                    nombre: c.nombre,
                                    detalle: c.detalle ?? "",
                                  })
                                }
                                className="text-brand-600 hover:underline"
                              >
                                Editar
                              </button>
                              <button onClick={() => void quitar(c)} className="text-red-600 hover:underline">
                                Quitar
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Total de puntos de la fase (la nota se calcula sobre 100)
function Ponderacion({ items }: { items: FaseContentItem[] }) {
  const evaluables = items.filter((i) => i.kind !== "MATERIAL");
  const total = evaluables.reduce((s, i) => s + (i.puntos ?? 0), 0);
  const sinPuntos = evaluables.filter((i) => !i.puntos).length;
  const ok = total === 100;
  const pct = Math.min(100, total);
  return (
    <div
      className={`mb-5 rounded-xl border p-4 ${
        total === 0 ? "border-gray-200 bg-white" : ok ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-gray-800">Ponderación de la fase</span>
        <span className={`font-bold ${ok ? "text-green-700" : total === 0 ? "text-gray-500" : "text-amber-700"}`}>
          {total} / 100 pts
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${ok ? "bg-green-500" : total > 100 ? "bg-red-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {total === 0
          ? "Asigna puntos a cada tarea, actividad y examen. Mientras ninguna tenga puntos, la nota se calcula por categoría (Tareas 50 %, Parciales 30 %, Examen final 20 %)."
          : ok
            ? "Los puntos de la fase suman 100. La nota del estudiante es la suma de los puntos que obtenga."
            : total > 100
              ? `Los puntos suman ${total}: pasan de 100. Ajusta los valores.`
              : `Faltan ${100 - total} pts para completar 100.`}
        {sinPuntos > 0 && total > 0 && ` Hay ${sinPuntos} elemento(s) sin puntos que no cuentan para la nota.`}
      </p>
    </div>
  );
}

// Nota mínima para aprobar (todas las fases) y mínimo del Reto de Comprensión
function Criterios({ readOnly }: { readOnly: boolean }) {
  const [nota, setNota] = useState("");
  const [reto, setReto] = useState("");
  const [guardado, setGuardado] = useState<{ notaMinima: number; retoMinimo: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ notaMinima: number; retoMinimo: number }>("/api/fase-extras/config")
      .then((c) => {
        setGuardado(c);
        setNota(String(c.notaMinima));
        setReto(String(c.retoMinimo));
      })
      .catch(() => undefined);
  }, []);

  if (!guardado) return null;
  const cambiado = nota !== String(guardado.notaMinima) || reto !== String(guardado.retoMinimo);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await api<{ notaMinima: number; retoMinimo: number }>("/api/fase-extras/config", {
        method: "PUT",
        body: { notaMinima: Number(nota), retoMinimo: Number(reto) },
      });
      setGuardado(c);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="min-w-[200px] flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Award aria-hidden className="h-4 w-4 text-brand-600" />
          Criterios de aprobación
        </p>
        <p className="text-xs text-gray-500">
          Aplican a todas las fases. Una fase completa con una nota menor queda
          como reprobada.
        </p>
      </div>
      <label className="text-xs text-gray-600">
        <span className="mb-1 block">Nota mínima de la fase</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={100}
            value={nota}
            disabled={readOnly}
            onChange={(e) => setNota(e.target.value)}
            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50"
          />
          <span className="text-gray-400">/ 100</span>
        </span>
      </label>
      <label className="text-xs text-gray-600">
        <span className="mb-1 block">Mínimo del Reto</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={100}
            value={reto}
            disabled={readOnly}
            onChange={(e) => setReto(e.target.value)}
            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50"
          />
          <span className="text-gray-400">%</span>
        </span>
      </label>
      {!readOnly && (
        <button
          type="submit"
          disabled={busy || !cambiado || !nota || !reto}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      )}
    </form>
  );
}
