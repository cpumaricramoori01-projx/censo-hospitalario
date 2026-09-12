"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ServicioResumen = {
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
  servicios: ServicioResumen[];
};

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

function porcentaje(ocupadas: number, total: number) {
  return total > 0 ? Math.round((ocupadas / total) * 100) : 0;
}

export default function PanelPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargarDatos() {
    try {
      setCargando(true);
      const [resumenRes, pacientesRes] = await Promise.all([
        fetch("/api/censo/resumen", { cache: "no-store" }),
        fetch("/api/censo/pacientes", { cache: "no-store" }),
      ]);

      if (!resumenRes.ok || !pacientesRes.ok) throw new Error("No se pudieron cargar los datos");

      setResumen(await resumenRes.json());
      setPacientes(await pacientesRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const pacientesRecientes = useMemo(() => pacientes.slice(0, 5), [pacientes]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
          <div>
            <p className="page-kicker" style={{ marginBottom: 6 }}>Gestión hospitalaria</p>
            <h1 style={{ margin: 0, fontSize: "clamp(27px,3vw,36px)", letterSpacing: "-.025em" }}>Panel principal</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>Resumen operativo del censo hospitalario.</p>
          </div>
          <button type="button" onClick={cargarDatos} disabled={cargando} style={{ border: "1px solid var(--border)", background: "white", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: cargando ? "wait" : "pointer" }}>
            {cargando ? "Actualizando..." : "↻ Actualizar"}
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          ["Camas", resumen?.camas.total ?? "—", "Capacidad total", "var(--primary)"],
          ["Libres", resumen?.camas.libres ?? "—", "Disponibilidad", "var(--success)"],
          ["Ocupadas", resumen?.camas.ocupadas ?? "—", "En uso actualmente", "#9a6414"],
          ["Hospitalizados", resumen?.pacientes.hospitalizados ?? "—", "Pacientes activos", "var(--secondary)"],
        ].map(([label, value, detail, color]) => (
          <article key={label} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 17px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ color: "var(--muted)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
            <div style={{ marginTop: 5, color, fontSize: 28, lineHeight: 1, fontWeight: 800 }}>{value}</div>
            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 11 }}>{detail}</div>
          </article>
        ))}
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 11 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Ocupación por servicio</h2>
            <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 12 }}>Disponibilidad actual de camas.</p>
          </div>
          <Link href="/test" style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Ver estructura →</Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9 }}>
          {(resumen?.servicios ?? []).map((servicio) => {
            const pct = porcentaje(servicio.ocupadas, servicio.total);
            return (
              <div key={servicio.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{servicio.nombre}</strong>
                  <span style={{ color: servicio.ocupadas > 0 ? "#9a6414" : "var(--success)", fontSize: 11, fontWeight: 800 }}>{servicio.ocupadas}/{servicio.total}</span>
                </div>
                <div style={{ height: 6, marginTop: 9, background: "#edf2f4", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: servicio.ocupadas > 0 ? "#d5a34d" : "#6fba9a", borderRadius: 999, transition: "width .2s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, color: "var(--muted)", fontSize: 10 }}>
                  <span>{servicio.libres} libres</span><span>{servicio.inoperativas} inoperativas</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div style={{ border: "1px solid #cfe3e7", background: "var(--primary-light)", borderRadius: 12, padding: "15px 17px" }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: "var(--primary-dark)" }}>Recursos clínicos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div><strong style={{ fontSize: 23, color: "var(--primary)" }}>{resumen?.pacientes.oxigeno ?? "—"}</strong><div style={{ fontSize: 10, color: "var(--muted)" }}>con oxígeno</div></div>
            <div><strong style={{ fontSize: 23, color: "var(--secondary)" }}>{resumen?.pacientes.ventilador ?? "—"}</strong><div style={{ fontSize: 10, color: "var(--muted)" }}>con ventilador</div></div>
          </div>
        </div>
        <div style={{ border: "1px solid var(--border)", background: "white", borderRadius: 12, padding: "15px 17px" }}>
          <div style={{ fontSize: 13, fontWeight: 750 }}>Acciones rápidas</div>
          <div style={{ display: "flex", gap: 9, marginTop: 11, flexWrap: "wrap" }}>
            <Link href="/ingresos/nuevo" style={{ padding: "9px 12px", borderRadius: 8, background: "var(--primary)", color: "white", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>↓ Registrar ingreso</Link>
            <Link href="/egresos/nuevo" style={{ padding: "9px 12px", borderRadius: 8, background: "var(--success-light)", color: "var(--success)", border: "1px solid #c4e5d4", textDecoration: "none", fontSize: 11, fontWeight: 700 }}>↑ Registrar egreso</Link>
          </div>
        </div>
      </section>

      <section style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "15px 17px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center" }}>
          <div><h2 style={{ margin: 0, fontSize: 16 }}>Hospitalización actual</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 11 }}>Vista rápida de los pacientes activos.</p></div>
          <Link href="/censo" style={{ color: "var(--primary)", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>Ver censo completo →</Link>
        </div>
        {pacientesRecientes.length === 0 ? (
          <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay pacientes hospitalizados actualmente.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ background: "#f8fafb" }}>{["HC", "Paciente", "Ubicación", "Médico", "Diagnóstico", "Recursos"].map((h) => <th key={h} style={{ padding: "9px 11px", textAlign: "left", color: "var(--muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{pacientesRecientes.map((p) => <tr key={p.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}>
                <td style={{ padding: "10px 11px", fontWeight: 750, whiteSpace: "nowrap" }}>{p.hc}</td>
                <td style={{ padding: "10px 11px", fontWeight: 700, minWidth: 170 }}>{p.paciente}</td>
                <td style={{ padding: "10px 11px", minWidth: 150 }}><strong>{p.servicio.nombre}</strong><div style={{ color: "var(--muted)", marginTop: 2 }}>{p.especialidad.nombre} · {p.cama.numero}</div></td>
                <td style={{ padding: "10px 11px", minWidth: 165 }}>{p.medico?.nombre ?? "No registrado"}</td>
                <td style={{ padding: "10px 11px", minWidth: 220 }}><strong>{p.diagnostico.codigo ?? "—"}</strong>{p.diagnostico.descripcion && <div style={{ marginTop: 2, color: "var(--muted)", lineHeight: 1.35 }}>{p.diagnostico.descripcion}</div>}</td>
                <td style={{ padding: "10px 11px", whiteSpace: "nowrap" }}>{p.usaOxigeno && <span style={{ marginRight: 5, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 9, fontWeight: 800 }}>O₂</span>}{p.usaVentilador && <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 9, fontWeight: 800 }}>VENT</span>}{!p.usaOxigeno && !p.usaVentilador && <span style={{ color: "var(--muted)" }}>—</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
