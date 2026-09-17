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

const reportes = [
  { titulo: "Censo actual", descripcion: "Consulta de los pacientes actualmente hospitalizados, su ubicación y recursos clínicos.", icono: "▤" },
  { titulo: "Ingresos", descripcion: "Información de los ingresos hospitalarios registrados en el sistema.", icono: "↓" },
  { titulo: "Egresos", descripcion: "Consulta de los egresos registrados y sus principales datos de atención.", icono: "↑" },
  { titulo: "Ocupación de camas", descripcion: "Distribución de camas ocupadas, libres e inoperativas por servicio.", icono: "▦" },
  { titulo: "Estancia hospitalaria", descripcion: "Consulta de días de hospitalización y estancias prolongadas.", icono: "◷" },
];

function diasEstancia(fecha: string) {
  const inicio = new Date(fecha).getTime();
  if (!Number.isFinite(inicio)) return "—";
  return Math.max(0, Math.floor((Date.now() - inicio) / 86400000));
}

export default function ReportesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [servicio, setServicio] = useState("todos");
  const [especialidad, setEspecialidad] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/censo/pacientes", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo consultar el censo hospitalario.");
        return response.json();
      })
      .then((data) => setPacientes(data))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el reporte."))
      .finally(() => setCargando(false));
  }, []);

  const servicios = useMemo(() => Array.from(new Map(pacientes.map((p) => [p.servicio.id, p.servicio])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre)), [pacientes]);
  const especialidades = useMemo(() => Array.from(new Map(pacientes.filter((p) => servicio === "todos" || String(p.servicio.id) === servicio).map((p) => [p.especialidad.id, p.especialidad])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre)), [pacientes, servicio]);

  const filtrados = useMemo(() => pacientes.filter((p) => {
    const coincideServicio = servicio === "todos" || String(p.servicio.id) === servicio;
    const coincideEspecialidad = especialidad === "todos" || String(p.especialidad.id) === especialidad;
    const texto = busqueda.trim().toLowerCase();
    const coincideBusqueda = !texto || p.paciente.toLowerCase().includes(texto) || p.hc.toLowerCase().includes(texto) || (p.diagnostico.descripcion ?? "").toLowerCase().includes(texto);
    return coincideServicio && coincideEspecialidad && coincideBusqueda;
  }), [pacientes, servicio, especialidad, busqueda]);

  return (
    <div className="panel-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
      <section className="page-heading" style={{ marginBottom: 22 }}>
        <div className="panel-page-heading">
          <div>
            <p className="page-kicker">Información hospitalaria</p>
            <h1 id="page-title">Reportes</h1>
            <p>Consulta y generación de información del censo hospitalario.</p>
          </div>
          <Link href="/panel" style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}>← Panel principal</Link>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <div className="section-heading" style={{ marginBottom: 12 }}><div><h2>Reporte de censo actual</h2><p>Pacientes que actualmente no tienen un egreso registrado.</p></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
          <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>BUSCAR PACIENTE / HC / DIAGNÓSTICO<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escriba para buscar..." style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} /></label>
          <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>SERVICIO<select value={servicio} onChange={(e) => { setServicio(e.target.value); setEspecialidad("todos"); }} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos los servicios</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
          <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>ESPECIALIDAD<select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todas las especialidades</option>{especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
        </div>
      </section>

      {error && <section role="alert" style={{ marginBottom: 18, padding: "12px 15px", background: "var(--danger-light)", border: "1px solid #ecc7c4", borderRadius: 10, color: "var(--danger)", fontSize: 12 }}>{error}</section>}

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><h2 style={{ margin: 0, fontSize: 15 }}>Hospitalización actual</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>Resultado: {cargando ? "consultando..." : `${filtrados.length} paciente${filtrados.length === 1 ? "" : "s"}`}</p></div>
          <button type="button" onClick={() => window.print()} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>🖨 Imprimir</button>
        </div>
        {cargando ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando pacientes hospitalizados...</div> : filtrados.length === 0 ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay pacientes que coincidan con los filtros seleccionados.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "#f8fafb" }}>{["Paciente / HC", "Servicio / Especialidad", "Cama", "Ingreso", "Estancia", "Diagnóstico", "Recursos"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((p) => <tr key={p.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}><td style={{ padding: "8px 10px", minWidth: 170 }}><strong style={{ display: "block", fontSize: 11 }}>{p.paciente}</strong><span style={{ color: "var(--muted)", fontSize: 9 }}>HC {p.hc}</span></td><td style={{ padding: "8px 10px", minWidth: 155 }}><strong style={{ fontSize: 10.5 }}>{p.servicio.nombre}</strong><span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9 }}>{p.especialidad.nombre}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>Cama {p.cama.numero}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{new Date(p.fechaIngreso).toLocaleDateString("es-PE")}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 800 }}>{diasEstancia(p.fechaIngreso)} d.</td><td style={{ padding: "8px 10px", minWidth: 200, maxWidth: 280 }}>{p.diagnostico.codigo && <strong>{p.diagnostico.codigo} · </strong>}<span style={{ color: "var(--muted)" }}>{p.diagnostico.descripcion || "—"}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{p.usaOxigeno && <span style={{ marginRight: 4, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 8.5, fontWeight: 800 }}>O₂</span>}{p.usaVentilador && <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 8.5, fontWeight: 800 }}>VENT</span>}{!p.usaOxigeno && !p.usaVentilador && "—"}</td></tr>)}</tbody></table></div>}
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="section-heading" style={{ marginBottom: 12 }}><div><h2>Otros reportes</h2><p>Se habilitarán progresivamente.</p></div></div>
        <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{reportes.slice(1).map((r) => <article key={r.titulo} className="dashboard-card" style={{ padding: 15, opacity: .75 }}><div className="dashboard-card-header"><div className="dashboard-card-icon blue" style={{ width: 36, height: 36, fontSize: 16 }}>{r.icono}</div></div><h2 style={{ marginTop: 11, fontSize: 14 }}>{r.titulo}</h2><p style={{ marginTop: 5, lineHeight: 1.4 }}>En preparación.</p></article>)}</div>
      </section>
    </div>
  );
}
