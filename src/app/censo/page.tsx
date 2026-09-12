"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Paciente = {
  ingresoId: number;
  hc: string;
  paciente: string;
  servicio: { id: number; nombre: string };
  especialidad: { id: number; nombre: string };
  cama: { id: number; numero: string };
  medico: { id: number; cmp: string; nombre: string } | null;
  diagnostico: { codigo: string | null; descripcion: string | null };
  fechaIngreso: string;
  usaOxigeno: boolean;
  usaVentilador: boolean;
};

export default function CensoPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [servicio, setServicio] = useState("todos");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    try {
      setCargando(true);
      const response = await fetch("/api/censo/pacientes", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar el censo");
      setPacientes(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const servicios = useMemo(() => {
    return Array.from(new Map(pacientes.map((p) => [p.servicio.id, p.servicio.nombre])).entries())
      .map(([id, nombre]) => ({ id, nombre }));
  }, [pacientes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pacientes.filter((p) => {
      const coincideServicio = servicio === "todos" || String(p.servicio.id) === servicio;
      const texto = [p.hc, p.paciente, p.servicio.nombre, p.especialidad.nombre, p.cama.numero, p.medico?.nombre ?? "", p.diagnostico.codigo ?? "", p.diagnostico.descripcion ?? ""].join(" ").toLowerCase();
      return coincideServicio && (!q || texto.includes(q));
    });
  }, [pacientes, busqueda, servicio]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <section className="page-heading" style={{ marginBottom: 20 }}>
        <p className="page-kicker">Hospitalización</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
          <div>
            <h1>Censo actual</h1>
            <p>Pacientes actualmente hospitalizados y su ubicación clínica.</p>
          </div>
          <button type="button" onClick={cargar} disabled={cargando} style={{ border: "1px solid var(--border)", background: "white", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: cargando ? "wait" : "pointer" }}>
            {cargando ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </div>
      </section>

      <section style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px auto", gap: 9, alignItems: "center" }}>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por HC, paciente, médico, cama o diagnóstico..." style={{ width: "100%", border: "1px solid #cbd9de", borderRadius: 8, padding: "10px 12px", font: "inherit", fontSize: 12, outline: "none" }} />
          <select value={servicio} onChange={(e) => setServicio(e.target.value)} style={{ width: "100%", border: "1px solid #cbd9de", borderRadius: 8, padding: "10px 12px", background: "white", font: "inherit", fontSize: 12 }}>
            <option value="todos">Todos los servicios</option>
            {servicios.map((s) => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
          </select>
          <span style={{ padding: "8px 10px", borderRadius: 8, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{filtrados.length} paciente{filtrados.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      <section style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><h2 style={{ margin: 0, fontSize: 16 }}>Pacientes hospitalizados</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 11 }}>Detalle del censo operativo actual.</p></div>
          <Link href="/panel" style={{ color: "var(--primary)", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>← Panel principal</Link>
        </div>
        {cargando ? <div style={{ padding: 25, color: "var(--muted)", fontSize: 12 }}>Cargando censo...</div> : filtrados.length === 0 ? <div style={{ padding: 28, color: "var(--muted)", fontSize: 12 }}>No se encontraron pacientes con los filtros actuales.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "#f8fafb" }}>{["HC", "Paciente", "Ubicación", "Médico", "Diagnóstico", "Ingreso", "Recursos"].map((h) => <th key={h} style={{ padding: "10px 11px", textAlign: "left", color: "var(--muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((p) => <tr key={p.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}>
                <td style={{ padding: "11px", fontWeight: 800, whiteSpace: "nowrap" }}>{p.hc}</td>
                <td style={{ padding: "11px", minWidth: 175 }}><strong>{p.paciente}</strong></td>
                <td style={{ padding: "11px", minWidth: 160 }}><strong>{p.servicio.nombre}</strong><div style={{ color: "var(--muted)", marginTop: 2 }}>{p.especialidad.nombre} · Cama {p.cama.numero}</div></td>
                <td style={{ padding: "11px", minWidth: 170 }}>{p.medico?.nombre ?? "No registrado"}{p.medico && <div style={{ color: "var(--muted)", marginTop: 2 }}>CMP {p.medico.cmp}</div>}</td>
                <td style={{ padding: "11px", minWidth: 250 }}>{p.diagnostico.codigo && <strong>{p.diagnostico.codigo}</strong>}{p.diagnostico.descripcion && <div style={{ color: "var(--muted)", marginTop: 2, lineHeight: 1.35 }}>{p.diagnostico.descripcion}</div>}</td>
                <td style={{ padding: "11px", whiteSpace: "nowrap" }}>{new Date(p.fechaIngreso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })}<div style={{ color: "var(--muted)", marginTop: 2 }}>{new Date(p.fechaIngreso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div></td>
                <td style={{ padding: "11px", whiteSpace: "nowrap" }}>{p.usaOxigeno && <span style={{ marginRight: 5, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 9, fontWeight: 800 }}>O₂</span>}{p.usaVentilador && <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 9, fontWeight: 800 }}>VENT</span>}{!p.usaOxigeno && !p.usaVentilador && <span style={{ color: "var(--muted)" }}>—</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
