"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import IngresosReportPage from "./ingresos/page";
import EgresosReportPage from "./egresos/page";
import OcupacionReportPage from "./ocupacion/page";
import EstanciaReportPage from "./estancia/page";

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

const reportesDisponibles = [
  { titulo: "Censo actual", descripcion: "Pacientes actualmente hospitalizados, ubicación, diagnóstico, estancia y soporte respiratorio.", icono: "▤", color: "blue", href: "/reportes" },
  { titulo: "Ingresos", descripcion: "Ingresos hospitalarios por período, servicio, especialidad y tipo.", icono: "↓", color: "green", href: "/reportes/ingresos" },
  { titulo: "Egresos", descripcion: "Egresos registrados y principales datos de atención y destino.", icono: "↑", color: "orange", href: "/reportes/egresos" },
  { titulo: "Ocupación de camas", descripcion: "Estado y distribución de camas por servicio y especialidad.", icono: "▦", color: "purple", href: "/reportes/ocupacion" },
  { titulo: "Estancia hospitalaria", descripcion: "Días de hospitalización y seguimiento de estancias prolongadas.", icono: "◷", color: "red", href: "/reportes/estancia" },
];

function diasEstancia(fecha: string) {
  const inicio = new Date(fecha).getTime();
  if (!Number.isFinite(inicio)) return 0;
  return Math.max(0, Math.floor((Date.now() - inicio) / 86400000));
}

function fechaCorta(fecha: string) {
  const valor = new Date(fecha);
  return Number.isFinite(valor.getTime()) ? valor.toLocaleDateString("es-PE") : "—";
}

export default function ReportesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [servicio, setServicio] = useState("todos");
  const [especialidad, setEspecialidad] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [reporteSeleccionado, setReporteSeleccionado] = useState("censo");

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

  const limpiarFiltros = () => {
    setServicio("todos");
    setEspecialidad("todos");
    setBusqueda("");
  };

  const exportarExcel = () => {
    const encabezados = ["HC", "Paciente", "Servicio", "Especialidad", "Cama", "Médico", "Fecha ingreso", "Días estancia", "Código diagnóstico", "Diagnóstico", "Oxígeno", "Ventilador"];
    const filas = filtrados.map((p) => [p.hc, p.paciente, p.servicio.nombre, p.especialidad.nombre, p.cama.numero, p.medico?.nombre ?? "", fechaCorta(p.fechaIngreso), diasEstancia(p.fechaIngreso), p.diagnostico.codigo ?? "", p.diagnostico.descripcion ?? "", p.usaOxigeno ? "Sí" : "No", p.usaVentilador ? "Sí" : "No"]);
    const esc = (valor: string | number) => String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
    const tabla = `<table><thead><tr>${encabezados.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${filas.map((fila) => `<tr>${fila.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const html = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial;font-size:10pt}th,td{border:1px solid #b8c2cc;padding:6px}th{font-weight:bold;background:#e9eef3}</style></head><body><h2>Hospital Regional Eleazar Guzmán Barrón</h2><h3>Reporte de Censo Hospitalario</h3><p>Registros: ${filas.length} | Generado: ${new Date().toLocaleString("es-PE")}</p>${tabla}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `censo-hospitalario-${new Date().toISOString().slice(0, 10)}.xls`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        @media print {
          .reportes-no-print { display:none !important; }
          .reportes-page { max-width:none !important; margin:0 !important; padding:0 !important; }
          .reportes-print { display:block !important; }
          body { background:#fff !important; }
          @page { size:A4 landscape; margin:12mm; }
        }
        .reportes-print { display:none; }
      `}</style>

      <div className="panel-page reportes-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
        <section className="page-heading reportes-no-print" style={{ marginBottom: 20 }}>
          <div className="panel-page-heading">
            <div>
              <p className="page-kicker">Información hospitalaria</p>
              <h1 id="page-title">Centro de reportes</h1>
              <p>Consulta, filtra, analiza, imprime y exporta información del sistema.</p>
              <div className="reportes-contexto" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 10, color: "var(--muted)" }}>
                <span style={{ fontWeight: 800, color: "var(--primary-dark)" }}>Reportes</span>
                <span>›</span>
                <span>{reportesDisponibles.find((r) => (r.href === "/reportes" ? "censo" : r.href.replace("/reportes/", "")) === reporteSeleccionado)?.titulo ?? "Censo actual"}</span>
                <span style={{ padding: "4px 8px", borderRadius: 999, background: "var(--surface-soft)", border: "1px solid var(--border)", fontWeight: 700 }}>Consulta hospitalaria</span>
              </div>
            </div>
            <Link href="/panel" style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}>← Panel principal</Link>
          </div>
        </section>

        {reporteSeleccionado === "censo" && <>
        <section className="reportes-no-print" style={{ marginBottom: 18 }}>
          <div className="section-heading" style={{ marginBottom: 12 }}><div><h2>Filtros de consulta</h2><p>Filtre la información del censo antes de revisar los indicadores y el detalle.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.5fr) repeat(2, minmax(180px, 1fr)) auto", gap: 10, alignItems: "end", padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>BUSCAR PACIENTE / HC / DIAGNÓSTICO<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escriba para buscar..." style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} /></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>SERVICIO<select value={servicio} onChange={(e) => { setServicio(e.target.value); setEspecialidad("todos"); }} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos los servicios</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>ESPECIALIDAD<select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todas las especialidades</option>{especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
            <button type="button" onClick={limpiarFiltros} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Limpiar</button>
          </div>
        </section>

        {error && <section role="alert" className="reportes-no-print" style={{ marginBottom: 18, padding: "12px 15px", background: "var(--danger-light)", border: "1px solid #ecc7c4", borderRadius: 10, color: "var(--danger)", fontSize: 12 }}>{error}</section>}

        <section className="reportes-no-print" style={{ marginBottom: 22 }}>
          <div className="section-heading" style={{ marginBottom: 12 }}><div><h2>Indicadores</h2><p>Resumen del estado actual de los pacientes hospitalizados.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["Pacientes", filtrados.length, "▤", "var(--primary)"],
              ["Servicios", new Set(filtrados.map((p) => p.servicio.id)).size, "▦", "#7563a8"],
              ["Especialidades", new Set(filtrados.map((p) => p.especialidad.id)).size, "⌘", "#16834b"],
              ["Estancia promedio", filtrados.length ? (filtrados.reduce((s, p) => s + diasEstancia(p.fechaIngreso), 0) / filtrados.length).toFixed(1) : "0.0", "◷", "#b66a2c"],
              ["Estancia ≥ 15 días", filtrados.filter((p) => diasEstancia(p.fechaIngreso) >= 15).length, "!", "#b33f3f"],
            ].map(([titulo, valor, icono, color]) => <article key={String(titulo)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 14px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-soft)", color: String(color), display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0 }}>{icono}</div><div><div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 800 }}>{titulo}</div><strong style={{ display: "block", fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>{cargando ? "—" : valor}</strong></div></article>)}
          </div>
        </section>

        <section className="reportes-no-print" style={{ marginBottom: 22 }}>
          <div className="section-heading" style={{ marginBottom: 12 }}><div><h2>Análisis visual</h2><p>Distribución de pacientes según servicio y soporte respiratorio.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)", gap: 14 }}>
            <article style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ margin: 0, fontSize: 13 }}>Pacientes por servicio</h3>
              <p style={{ margin: "4px 0 14px", fontSize: 10, color: "var(--muted)" }}>Distribución del censo actualmente filtrado.</p>
              {Array.from(new Map(filtrados.map((p) => [p.servicio.id, p.servicio.nombre])).entries()).map(([id, nombre]) => {
                const cantidad = filtrados.filter((p) => p.servicio.id === id).length;
                const maximo = Math.max(1, ...Array.from(new Set(filtrados.map((p) => p.servicio.id))).map((sid) => filtrados.filter((p) => p.servicio.id === sid).length));
                return <div key={id} style={{ marginBottom: 11 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, marginBottom: 4 }}><span>{nombre}</span><span>{cantidad}</span></div><div style={{ height: 9, background: "var(--surface-soft)", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", width: `${(cantidad / maximo) * 100}%`, background: "var(--primary)", borderRadius: 999 }} /></div></div>;
              })}
              {filtrados.length === 0 && <p style={{ color: "var(--muted)", fontSize: 11 }}>No hay datos para mostrar.</p>}
            </article>
            <article style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ margin: 0, fontSize: 13 }}>Soporte respiratorio</h3>
              <p style={{ margin: "4px 0 16px", fontSize: 10, color: "var(--muted)" }}>Pacientes según soporte registrado.</p>
              {(() => { const sin = filtrados.filter((p) => !p.usaOxigeno && !p.usaVentilador).length; const ox = filtrados.filter((p) => p.usaOxigeno && !p.usaVentilador).length; const vent = filtrados.filter((p) => p.usaVentilador).length; const total = Math.max(1, filtrados.length); return [["Sin soporte", sin, "#7b8794"], ["Oxígeno", ox, "var(--primary)"], ["Ventilador", vent, "#b33f3f"]].map(([nombre, cantidad, color]) => <div key={String(nombre)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: String(color), flexShrink: 0 }} /><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, marginBottom: 4 }}><span>{nombre}</span><span>{cantidad}</span></div><div style={{ height: 8, background: "var(--surface-soft)", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", width: `${(Number(cantidad) / total) * 100}%`, background: String(color), borderRadius: 999 }} /></div></div></div>); })()}
            </article>
          </div>
        </section>

        <section className="reportes-no-print" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0, fontSize: 15 }}>Detalle del reporte</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>Hospitalización actual · {cargando ? "consultando..." : `${filtrados.length} paciente${filtrados.length === 1 ? "" : "s"}`}</p></div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" onClick={() => window.print()} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>🖨 Imprimir / PDF</button><button type="button" onClick={exportarExcel} disabled={cargando || filtrados.length === 0} style={{ border: "1px solid #4f7b58", background: "#fff", color: "#38633f", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: cargando || filtrados.length === 0 ? .5 : 1 }}>📊 Excel</button></div>
          </div>
          {cargando ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando pacientes hospitalizados...</div> : filtrados.length === 0 ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay pacientes que coincidan con los filtros seleccionados.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "#f8fafb" }}>{["Paciente / HC", "Servicio / Especialidad", "Cama", "Ingreso", "Estancia", "Diagnóstico", "Soporte respiratorio"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((p) => <tr key={p.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}><td style={{ padding: "8px 10px", minWidth: 170 }}><strong style={{ display: "block", fontSize: 11 }}>{p.paciente}</strong><span style={{ color: "var(--muted)", fontSize: 9 }}>HC {p.hc}</span></td><td style={{ padding: "8px 10px", minWidth: 155 }}><strong style={{ fontSize: 10.5 }}>{p.servicio.nombre}</strong><span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9 }}>{p.especialidad.nombre}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>Cama {p.cama.numero}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fechaCorta(p.fechaIngreso)}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 800 }}>{diasEstancia(p.fechaIngreso)} d.</td><td style={{ padding: "8px 10px", minWidth: 200, maxWidth: 280 }}>{p.diagnostico.codigo && <strong>{p.diagnostico.codigo} · </strong>}<span style={{ color: "var(--muted)" }}>{p.diagnostico.descripcion || "—"}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{p.usaOxigeno && <span style={{ marginRight: 4, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 8.5, fontWeight: 800 }}>Oxígeno</span>}{p.usaVentilador && <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 8.5, fontWeight: 800 }}>Ventilador</span>}{!p.usaOxigeno && !p.usaVentilador && "Sin soporte"}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="reportes-print">      {reporteSeleccionado === "ingresos" && <IngresosReportPage />}
      {reporteSeleccionado === "egresos" && <EgresosReportPage />}
      {reporteSeleccionado === "ocupacion" && <OcupacionReportPage />}
      {reporteSeleccionado === "estancia" && <EstanciaReportPage />}
      </div>
    </>
  );
}
