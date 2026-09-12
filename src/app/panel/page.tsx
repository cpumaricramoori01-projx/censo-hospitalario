"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ResumenServicio = {
  id: number;
  nombre: string;
  total: number;
  libres: number;
  ocupadas: number;
  inoperativas: number;
};

type Resumen = {
  camas: {
    total: number;
    libres: number;
    ocupadas: number;
    inoperativas: number;
  };
  pacientes: {
    hospitalizados: number;
    oxigeno: number;
    ventilador: number;
  };
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
  } as React.CSSProperties,
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
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el censo hospitalario.",
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarCenso();
  }, [cargarCenso]);

  const indicadores = [
    {
      label: "Camas totales",
      value: resumen?.camas.total ?? 0,
      detail: "Capacidad instalada",
      color: "var(--primary)",
      bg: "var(--primary-light)",
      icon: "▣",
    },
    {
      label: "Camas libres",
      value: resumen?.camas.libres ?? 0,
      detail: "Disponibilidad actual",
      color: "var(--success)",
      bg: "var(--success-light)",
      icon: "✓",
    },
    {
      label: "Camas ocupadas",
      value: resumen?.camas.ocupadas ?? 0,
      detail: "En uso actualmente",
      color: "#9a6414",
      bg: "var(--warning-light)",
      icon: "●",
    },
    {
      label: "Hospitalizados",
      value: resumen?.pacientes.hospitalizados ?? 0,
      detail: "Ingresos activos",
      color: "var(--secondary)",
      bg: "var(--secondary-light)",
      icon: "♟",
    },
  ];

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto" }}>
      <section className="page-heading" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <div>
            <p className="page-kicker">Gestión hospitalaria</p>
            <h1 id="page-title">Panel principal</h1>
            <p>Resumen operativo del censo y disponibilidad hospitalaria.</p>
          </div>
          <button
            type="button"
            onClick={() => cargarCenso(true)}
            disabled={actualizando}
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              color: "var(--primary-dark)",
              borderRadius: 9,
              padding: "9px 13px",
              font: "inherit",
              fontSize: 12,
              fontWeight: 700,
              cursor: actualizando ? "wait" : "pointer",
              boxShadow: "var(--shadow-sm)",
              whiteSpace: "nowrap",
            }}
          >
            {actualizando ? "Actualizando..." : "↻ Actualizar censo"}
          </button>
        </div>
      </section>

      {error && (
        <section
          role="alert"
          style={{
            ...estilos.tarjeta,
            marginBottom: 20,
            padding: "12px 15px",
            background: "var(--danger-light)",
            borderColor: "#ecc7c4",
          }}
        >
          <strong style={{ display: "block", color: "var(--danger)", fontSize: 12 }}>
            No se pudo actualizar el censo
          </strong>
          <span style={{ display: "block", marginTop: 3, color: "#7c5552", fontSize: 12 }}>
            {error}
          </span>
        </section>
      )}

      <section aria-labelledby="situacion-title" style={{ marginBottom: 25 }}>
        <div className="section-heading" style={{ marginBottom: 10 }}>
          <div>
            <h2 id="situacion-title">Situación actual</h2>
            <p>Indicadores principales del censo hospitalario.</p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {indicadores.map((indicador) => (
            <article key={indicador.label} style={{ ...estilos.tarjeta, padding: "13px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "var(--muted)", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {indicador.label}
                  </div>
                  <div style={{ marginTop: 5, color: indicador.color, fontSize: 27, lineHeight: 1, fontWeight: 800 }}>
                    {cargando ? "—" : indicador.value}
                  </div>
                </div>
                <div style={{ width: 34, height: 34, flex: "0 0 34px", borderRadius: 9, background: indicador.bg, color: indicador.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
                  {indicador.icon}
                </div>
              </div>
              <div style={{ marginTop: 7, color: "var(--muted)", fontSize: 10 }}>{indicador.detail}</div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="servicios-title" style={{ marginBottom: 25 }}>
        <div className="section-heading" style={{ marginBottom: 10 }}>
          <div>
            <h2 id="servicios-title">Ocupación por servicio</h2>
            <p>Distribución de camas y nivel de ocupación actual.</p>
          </div>
          <Link href="/test" style={{ color: "var(--primary)", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
            Ver estructura →
          </Link>
        </div>

        {cargando ? (
          <div style={{ ...estilos.tarjeta, padding: 18, color: "var(--muted)", fontSize: 12 }}>
            Consultando disponibilidad por servicio...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {(resumen?.servicios ?? []).map((servicio) => {
              const pct = porcentaje(servicio.ocupadas, servicio.total);
              const color = pct >= 90 ? "var(--danger)" : pct >= 75 ? "#b37a20" : "var(--secondary)";
              return (
                <article key={servicio.id} style={{ ...estilos.tarjeta, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <strong style={{ fontSize: 13 }}>{servicio.nombre}</strong>
                    <span style={{ color, fontSize: 11, fontWeight: 800 }}>{servicio.ocupadas}/{servicio.total}</span>
                  </div>
                  <div style={{ height: 6, marginTop: 9, background: "#edf2f4", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .2s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, color: "var(--muted)", fontSize: 10 }}>
                    <span>{servicio.libres} libres</span>
                    <span>{servicio.inoperativas} inoperativas</span>
                    <span>{pct}% ocupación</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 25 }}>
        <article style={{ ...estilos.tarjeta, padding: "14px 16px", background: "var(--primary-light)", borderColor: "#cfe3e7" }}>
          <div style={{ color: "var(--primary-dark)", fontSize: 13, fontWeight: 750 }}>Recursos clínicos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 9 }}>
            <div>
              <strong style={{ color: "var(--primary)", fontSize: 22 }}>{cargando ? "—" : resumen?.pacientes.oxigeno ?? 0}</strong>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>pacientes con oxígeno</div>
            </div>
            <div>
              <strong style={{ color: "var(--secondary)", fontSize: 22 }}>{cargando ? "—" : resumen?.pacientes.ventilador ?? 0}</strong>
              <div style={{ color: "var(--muted)", fontSize: 10 }}>con ventilador</div>
            </div>
          </div>
        </article>

        <article style={{ ...estilos.tarjeta, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 750 }}>Acciones rápidas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link href="/ingresos/nuevo" style={{ padding: "8px 11px", borderRadius: 8, background: "var(--primary)", color: "#fff", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
              ↓ Registrar ingreso
            </Link>
            <Link href="/egresos/nuevo" style={{ padding: "8px 11px", borderRadius: 8, background: "var(--success-light)", color: "var(--success)", border: "1px solid #c4e5d4", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
              ↑ Registrar egreso
            </Link>
          </div>
        </article>
      </section>

      <section aria-labelledby="pacientes-title" style={{ ...estilos.tarjeta, overflow: "hidden", marginBottom: 25 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15 }}>
          <div>
            <h2 id="pacientes-title" style={{ margin: 0, fontSize: 16 }}>Hospitalización actual</h2>
            <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 11 }}>Pacientes que actualmente no tienen un egreso registrado.</p>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
            {pacientes.length} activo{pacientes.length === 1 ? "" : "s"}
          </span>
        </div>

        {cargando ? (
          <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando pacientes hospitalizados...</div>
        ) : pacientes.length === 0 ? (
          <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay pacientes hospitalizados actualmente.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f8fafb" }}>
                  {["HC", "Paciente", "Ubicación", "Médico", "Diagnóstico", "Recursos"].map((encabezado) => (
                    <th key={encabezado} style={{ padding: "9px 11px", textAlign: "left", color: "var(--muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>
                      {encabezado}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pacientes.map((paciente) => (
                  <tr key={paciente.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}>
                    <td style={{ padding: "10px 11px", fontWeight: 750, whiteSpace: "nowrap" }}>{paciente.hc}</td>
                    <td style={{ padding: "10px 11px", minWidth: 170 }}>
                      <strong>{paciente.paciente}</strong>
                    </td>
                    <td style={{ padding: "10px 11px", minWidth: 160 }}>
                      <strong>{paciente.servicio.nombre}</strong>
                      <div style={{ color: "var(--muted)", marginTop: 2 }}>{paciente.especialidad.nombre} · Cama {paciente.cama.numero}</div>
                    </td>
                    <td style={{ padding: "10px 11px", minWidth: 155 }}>
                      {paciente.medico ? (
                        <>
                          <strong>{paciente.medico.nombre}</strong>
                          <small style={{ display: "block", marginTop: 2, color: "var(--muted)" }}>CMP {paciente.medico.cmp}</small>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>No registrado</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 11px", minWidth: 220 }}>
                      {paciente.diagnostico.codigo && <strong>{paciente.diagnostico.codigo}</strong>}
                      {paciente.diagnostico.descripcion && (
                        <div style={{ marginTop: 2, color: "var(--muted)", lineHeight: 1.35 }}>{paciente.diagnostico.descripcion}</div>
                      )}
                      {!paciente.diagnostico.codigo && !paciente.diagnostico.descripcion && "—"}
                    </td>
                    <td style={{ padding: "10px 11px", whiteSpace: "nowrap" }}>
                      {paciente.usaOxigeno && (
                        <span style={{ marginRight: 5, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 9, fontWeight: 800 }}>O₂</span>
                      )}
                      {paciente.usaVentilador && (
                        <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 9, fontWeight: 800 }}>VENT</span>
                      )}
                      {!paciente.usaOxigeno && !paciente.usaVentilador && <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="modulos-title">
        <div className="section-heading" style={{ marginBottom: 10 }}>
          <div>
            <h2 id="modulos-title">Módulos disponibles</h2>
            <p>Accesos principales del sistema.</p>
          </div>
        </div>
        <div className="dashboard-grid" style={{ gap: 12 }}>
          <Link href="/ingresos/nuevo" className="dashboard-card" style={{ padding: 16 }}>
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon blue" style={{ width: 36, height: 36, fontSize: 17 }}>↓</div>
              <span className="dashboard-card-arrow">→</span>
            </div>
            <h2 style={{ marginTop: 13, fontSize: 16 }}>Registrar ingreso</h2>
            <p style={{ fontSize: 12 }}>Registra un nuevo paciente y asigna servicio, especialidad y cama.</p>
          </Link>
          <Link href="/egresos/nuevo" className="dashboard-card" style={{ padding: 16 }}>
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon green" style={{ width: 36, height: 36, fontSize: 17 }}>↑</div>
              <span className="dashboard-card-arrow">→</span>
            </div>
            <h2 style={{ marginTop: 13, fontSize: 16 }}>Registrar egreso</h2>
            <p style={{ fontSize: 12 }}>Registra la salida del paciente y actualiza la disponibilidad de cama.</p>
          </Link>
          <Link href="/test" className="dashboard-card" style={{ padding: 16 }}>
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon teal" style={{ width: 36, height: 36, fontSize: 17 }}>⚙</div>
              <span className="dashboard-card-arrow">→</span>
            </div>
            <h2 style={{ marginTop: 13, fontSize: 16 }}>Estructura hospitalaria</h2>
            <p style={{ fontSize: 12 }}>Consulta servicios, especialidades, camas y su disponibilidad.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
