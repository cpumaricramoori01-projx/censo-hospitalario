"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

type ResumenServicio = {
  id: number;
  nombre: string;
  total: number;
  libres: number;
  ocupadas: number;
  inoperativas: number;
};

type Resumen = {
  camas: { total: number; libres: number; ocupadas: number; inoperativas: number };
  pacientes: { hospitalizados: number; oxigeno: number; ventilador: number };
  servicios: ResumenServicio[];
};

type PacienteHospitalizado = {
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

function porcentaje(ocupadas: number, total: number) {
  return total > 0 ? Math.round((ocupadas / total) * 100) : 0;
}

const estilos = {
  tarjeta: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "var(--shadow-sm)",
  } as CSSProperties,
};

export default function PanelPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [pacientes, setPacientes] = useState<PacienteHospitalizado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargarCenso = useCallback(async (mostrarCarga = false) => {
    try {
      if (mostrarCarga) setActualizando(true);
      setError("");

      const [resumenResponse, pacientesResponse] = await Promise.all([
        fetch("/api/censo/resumen", { cache: "no-store" }),
        fetch("/api/censo/pacientes", { cache: "no-store" }),
      ]);

      if (!resumenResponse.ok || !pacientesResponse.ok) {
        throw new Error("No se pudo consultar el censo hospitalario.");
      }

      const [resumenData, pacientesData] = await Promise.all([
        resumenResponse.json(),
        pacientesResponse.json(),
      ]);

      setResumen(resumenData);
      setPacientes(pacientesData);
    } catch (err) {
      console.error("Error cargando censo:", err);
      setError(err instanceof Error ? err.message : "No se pudo cargar el censo hospitalario.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarCenso();
  }, [cargarCenso]);

  const indicadores: Array<[string, number, string, string, string, string]> = [
    ["Camas totales", resumen?.camas.total ?? 0, "Capacidad instalada", "var(--primary)", "var(--primary-light)", "▣"],
    ["Camas libres", resumen?.camas.libres ?? 0, "Disponibilidad actual", "var(--success)", "var(--success-light)", "✓"],
    ["Camas ocupadas", resumen?.camas.ocupadas ?? 0, "En uso actualmente", "#9a6414", "var(--warning-light)", "●"],
    ["Hospitalizados", resumen?.pacientes.hospitalizados ?? 0, "Ingresos activos", "var(--secondary)", "var(--secondary-light)", "♟"],
  ];

  return (
    <div className="panel-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
      <section className="page-heading" style={{ marginBottom: 22 }}>
        <div className="panel-page-heading">
          <div>
            <p className="page-kicker">Gestión hospitalaria</p>
            <h1 id="page-title">Panel principal</h1>
            <p>Resumen operativo del censo y disponibilidad hospitalaria.</p>
          </div>
          <button type="button" onClick={() => cargarCenso(true)} disabled={actualizando} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: actualizando ? "wait" : "pointer", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}>
            {actualizando ? "Actualizando..." : "↻ Actualizar censo"}
          </button>
        </div>
      </section>

      {error && <section role="alert" style={{ ...estilos.tarjeta, marginBottom: 20, padding: "12px 15px", background: "var(--danger-light)", borderColor: "#ecc7c4" }}><strong style={{ display: "block", color: "var(--danger)", fontSize: 12 }}>No se pudo actualizar el censo</strong><span style={{ display: "block", marginTop: 3, color: "#7c5552", fontSize: 12 }}>{error}</span></section>}

      <section aria-labelledby="situacion-title" style={{ marginBottom: 25 }}>
        <div className="section-heading" style={{ marginBottom: 10 }}><div><h2 id="situacion-title">Situación actual</h2><p>Indicadores principales del censo hospitalario.</p></div></div>
        <div className="panel-kpi-grid">
          {indicadores.map(([label, value, detail, color, bg, icon]) => <article key={label} style={{ ...estilos.tarjeta, padding: "13px 15px" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><div style={{ minWidth: 0 }}><div style={{ color: "var(--muted)", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div><div style={{ marginTop: 5, color, fontSize: 27, lineHeight: 1, fontWeight: 800 }}>{cargando ? "—" : value}</div></div><div style={{ width: 34, height: 34, flex: "0 0 34px", borderRadius: 9, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{icon}</div></div><div style={{ marginTop: 7, color: "var(--muted)", fontSize: 10 }}>{detail}</div></article>)}
        </div>
      </section>

      <section aria-labelledby="servicios-title" style={{ marginBottom: 25 }}>
        <div className="section-heading" style={{ marginBottom: 10 }}><div><h2 id="servicios-title">Ocupación por servicio</h2><p>Distribución de camas y nivel de ocupación actual.</p></div><Link href="/test" style={{ color: "var(--primary)", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>Ver estructura →</Link></div>
        {cargando ? <div style={{ ...estilos.tarjeta, padding: 18, color: "var(--muted)", fontSize: 12 }}>Consultando disponibilidad por servicio...</div> : <div className="panel-service-grid">{(resumen?.servicios ?? []).map((servicio) => { const pct = porcentaje(servicio.ocupadas, servicio.total); const color = pct >= 90 ? "var(--danger)" : pct >= 75 ? "#b37a20" : "var(--secondary)"; return <article key={servicio.id} style={{ ...estilos.tarjeta, padding: "12px 14px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><strong style={{ fontSize: 13 }}>{servicio.nombre}</strong><span style={{ color, fontSize: 11, fontWeight: 800 }}>{servicio.ocupadas}/{servicio.total}</span></div><div style={{ height: 6, marginTop: 9, background: "#edf2f4", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .2s ease" }} /></div><div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, color: "var(--muted)", fontSize: 10 }}><span>{servicio.libres} libres</span><span>{servicio.inoperativas} inoperativas</span><span>{pct}% ocupación</span></div></article>; })}</div>}
      </section>

      <section className="panel-secondary-grid" style={{ marginBottom: 25 }}>
        <article style={{ ...estilos.tarjeta, padding: "14px 16px", background: "var(--primary-light)", borderColor: "#cfe3e7" }}><div style={{ color: "var(--primary-dark)", fontSize: 13, fontWeight: 750 }}>Recursos clínicos</div><div className="panel-resource-grid"><div><strong style={{ color: "var(--primary)", fontSize: 22 }}>{cargando ? "—" : resumen?.pacientes.oxigeno ?? 0}</strong><div style={{ color: "var(--muted)", fontSize: 10 }}>pacientes con oxígeno</div></div><div><strong style={{ color: "var(--secondary)", fontSize: 22 }}>{cargando ? "—" : resumen?.pacientes.ventilador ?? 0}</strong><div style={{ color: "var(--muted)", fontSize: 10 }}>con ventilador</div></div></div></article>
        <article style={{ ...estilos.tarjeta, padding: "14px 16px" }}><div style={{ fontSize: 13, fontWeight: 750 }}>Acciones rápidas</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}><Link href="/ingresos/nuevo" style={{ padding: "8px 11px", borderRadius: 8, background: "var(--primary)", color: "#fff", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>↓ Registrar ingreso</Link><Link href="/egresos/nuevo" style={{ padding: "8px 11px", borderRadius: 8, background: "var(--success-light)", color: "var(--success)", border: "1px solid #c4e5d4", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>↑ Registrar egreso</Link></div></article>
      </section>

      <section aria-labelledby="pacientes-title" style={{ ...estilos.tarjeta, overflow: "hidden", marginBottom: 25 }}>
        <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15 }}>
          <div>
            <h2 id="pacientes-title" style={{ margin: 0, fontSize: 15 }}>Hospitalización actual</h2>
            <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>Pacientes que actualmente no tienen un egreso registrado.</p>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{pacientes.length} activo{pacientes.length === 1 ? "" : "s"}</span>
        </div>
        {cargando ? <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Cargando pacientes hospitalizados...</div> : pacientes.length === 0 ? <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>No hay pacientes hospitalizados actualmente.</div> : <div style={{ overflowX: "auto" }}><table className="panel-hospital-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "#f8fafb" }}>{["Paciente / HC", "Ubicación", "Médico", "Diagnóstico", "Recursos"].map((encabezado) => <th key={encabezado} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{encabezado}</th>)}</tr></thead><tbody>{pacientes.map((paciente) => <tr key={paciente.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}>
          <td style={{ padding: "8px 10px", minWidth: 175 }}><strong style={{ display: "block", fontSize: 11 }}>{paciente.paciente}</strong><span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9 }}>HC {paciente.hc}</span></td>
          <td style={{ padding: "8px 10px", minWidth: 155 }}><strong style={{ fontSize: 10.5 }}>{paciente.servicio.nombre}</strong><span style={{ display: "block", color: "var(--muted)", marginTop: 2, fontSize: 9 }}>{paciente.especialidad.nombre} · Cama {paciente.cama.numero}</span></td>
          <td style={{ padding: "8px 10px", minWidth: 145 }}>{paciente.medico ? <><strong style={{ fontSize: 10.5 }}>{paciente.medico.nombre}</strong><small style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 8.5 }}>CMP {paciente.medico.cmp}</small></> : <span style={{ color: "var(--muted)" }}>No registrado</span>}</td>
          <td style={{ padding: "8px 10px", minWidth: 190, maxWidth: 280 }}><div style={{ lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{paciente.diagnostico.codigo && <strong>{paciente.diagnostico.codigo}{paciente.diagnostico.descripcion ? " · " : ""}</strong>}{paciente.diagnostico.descripcion && <span style={{ color: "var(--muted)" }}>{paciente.diagnostico.descripcion}</span>}{!paciente.diagnostico.codigo && !paciente.diagnostico.descripcion && "—"}</div></td>
          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{paciente.usaOxigeno && <span style={{ marginRight: 4, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 8.5, fontWeight: 800 }}>O₂</span>}{paciente.usaVentilador && <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 8.5, fontWeight: 800 }}>VENT</span>}{!paciente.usaOxigeno && !paciente.usaVentilador && <span style={{ color: "var(--muted)" }}>—</span>}</td>
        </tr>)}</tbody></table></div>}
      </section>

      <section aria-labelledby="modulos-title">
        <div className="section-heading" style={{ marginBottom: 10 }}><div><h2 id="modulos-title">Módulos disponibles</h2><p>Accesos principales del sistema.</p></div></div>
        <div className="dashboard-grid" style={{ gap: 12 }}>
          <Link href="/ingresos/nuevo" className="dashboard-card" style={{ padding: 16 }}><div className="dashboard-card-header"><div className="dashboard-card-icon blue" style={{ width: 36, height: 36, fontSize: 17 }}>↓</div><span className="dashboard-card-arrow">→</span></div><h2 style={{ marginTop: 13, fontSize: 16 }}>Registrar ingreso</h2><p style={{ fontSize: 12 }}>Registra un nuevo paciente y asigna servicio, especialidad y cama.</p></Link>
          <Link href="/egresos/nuevo" className="dashboard-card" style={{ padding: 16 }}><div className="dashboard-card-header"><div className="dashboard-card-icon green" style={{ width: 36, height: 36, fontSize: 17 }}>↑</div><span className="dashboard-card-arrow">→</span></div><h2 style={{ marginTop: 13, fontSize: 16 }}>Registrar egreso</h2><p style={{ fontSize: 12 }}>Registra la salida del paciente y actualiza la disponibilidad de cama.</p></Link>
          <Link href="/test" className="dashboard-card" style={{ padding: 16 }}><div className="dashboard-card-header"><div className="dashboard-card-icon teal" style={{ width: 36, height: 36, fontSize: 17 }}>⚙</div><span className="dashboard-card-arrow">→</span></div><h2 style={{ marginTop: 13, fontSize: 16 }}>Estructura hospitalaria</h2><p style={{ fontSize: 12 }}>Consulta servicios, especialidades, camas y su disponibilidad.</p></Link>
        </div>
      </section>
    </div>
  );
}
