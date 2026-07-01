"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { coordsFor } from "@/lib/gt-municipios";
import type { OverviewData } from "@/lib/types";

// Mapa interactivo (Leaflet + OpenStreetMap) con una burbuja por municipio,
// proporcional a la cantidad de estudiantes. Leaflet se carga en el cliente.
export function MunicipioMap({ data }: { data: OverviewData }) {
  const ref = useRef<HTMLDivElement>(null);

  const located = data.studentsByMunicipality
    .map((m) => {
      const c = coordsFor(m.department, m.municipality);
      return c ? { ...m, lng: c[0], lat: c[1] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const noCoords = data.studentsByMunicipality.filter(
    (m) => !coordsFor(m.department, m.municipality)
  );
  const totalUbicados = located.reduce((s, m) => s + m.count, 0);
  const max = Math.max(1, ...located.map((m) => m.count));

  useEffect(() => {
    if (!ref.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !ref.current) return;
      // Guatemala centrada
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(
        [15.2, -89.5],
        7
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      for (const m of located) {
        const r = 8 + (Math.sqrt(m.count) / Math.sqrt(max)) * 22;
        L.circleMarker([m.lat, m.lng], {
          radius: r,
          color: "#16314f",
          weight: 1.5,
          fillColor: "#2563eb",
          fillOpacity: 0.45,
        })
          .addTo(map!)
          .bindPopup(
            `<strong>${m.municipality}</strong><br/>${m.department}<br/>${m.count} estudiante${m.count === 1 ? "" : "s"}`
          )
          .bindTooltip(`${m.municipality}: ${m.count}`);
      }

      // Ajusta el encuadre a las burbujas si hay datos.
      if (located.length > 0) {
        const bounds = L.latLngBounds(located.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds.pad(0.3), { maxZoom: 10 });
      }
    });

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
        Estudiantes por municipio
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white lg:col-span-2">
          <div ref={ref} style={{ height: 420, width: "100%" }} />
        </div>

        {/* Resumen lateral */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-brand-800">
            Distribución geográfica
          </h3>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-brand-800">{totalUbicados}</span>{" "}
            estudiantes ubicados en{" "}
            <span className="font-semibold text-brand-800">{located.length}</span>{" "}
            municipios.
          </p>
          <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto text-sm">
            {located
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((m) => (
                <li
                  key={`${m.department}-${m.municipality}`}
                  className="flex justify-between"
                >
                  <span className="text-gray-600">
                    {m.municipality}
                    <span className="text-gray-400"> · {m.department}</span>
                  </span>
                  <span className="font-medium text-gray-800">{m.count}</span>
                </li>
              ))}
          </ul>
          {data.studentsWithoutLocation > 0 && (
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {data.studentsWithoutLocation} estudiante(s) sin municipio
              registrado (se completan en el expediente).
            </p>
          )}
          {noCoords.length > 0 && (
            <p className="mt-2 text-xs text-amber-600">
              {noCoords.length} municipio(s) no reconocidos:{" "}
              {noCoords.map((m) => m.municipality).join(", ")}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
