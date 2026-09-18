"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Ingreso = {
  id: number;
  hc: string;
  paciente: string;
  fechaIngreso: string;
  tipoIngreso: string;
  financiamiento: string | null;
  cama: string;
  ubicacion: string | null;
  especialidad: string;
  servicio: string;
  medico: string;
  diagnosticoCodigo: string | null;
  diagnostico: string | null;
  activo: boolean;
};

function fechaLocal(valor: Date) {
  return valor.toLocaleDateString("en-CA");
}

function fechaCorta(fecha: string) {
  const valor = new Date(fecha);
  return Number.isFinite(valor.getTime()) ? valor.toLocaleDateString("es-PE") : "—";
}

function fechaHora(fecha: string) {
  const valor = new Date(fecha);
  return Number.isFinite(valor.getTime()) ? valor.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default function IngresosReportPage() {
  const hoy = useMemo(() => new Date(), []);
  const inicioMes = useMemo(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1), [hoy]);

  const [desde, setDesde] = useState(fechaLocal(inicioMes));
  const [hasta, setHasta] = useState(fechaLocal(hoy));
  const [servicio, setServicio] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [datos, setDatos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const consultar = async () => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      if (servicio !== "todos") params.set("servicioId", servicio);
      if (tipo !== "todos") params.set("tipo", tipo);
      const response = await fetch(`/api/reportes/ingresos?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo consultar el reporte de ingresos.");
      setDatos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el reporte.");
      setDatos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { consultar(); }, []);

  const servicios = useMemo(() => Array.from(new Set(datos.map((d) => d.servicio))).sort((a, b) => a.localeCompare(b)), [datos]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return datos.filter((d) => !texto || d.paciente.toLowerCase().includes(texto) || d.hc.toLowerCase().includes(texto) || d.medico.toLowerCase().includes(texto) || (d.diagnostico ?? "").toLowerCase().includes(texto));
  }, [datos, busqueda]);

  const normales = datos.filter((d) => d.tipoIngreso === "normal").length;
  const transferencias = datos.filter((d) => d.tipoIngreso === "transferencia").length;
  const activos = datos.filter((d) => d.activo).length;

  const limpiar = () => {
    setDesde(fechaLocal(inicioMes));
    setHasta(fechaLocal(hoy));
    setServicio("todos");
    setTipo("todos");
    setBusqueda("");
    setTimeout(consultar, 0);
  };

  const exportarExcel = () => {
    const encabezados = ["HC", "Paciente", "Fecha y hora", "Tipo de ingreso", "Servicio", "Especialidad", "Cama", "Ubicación", "Médico responsable", "Financiamiento", "Código diagnóstico", "Diagnóstico", "Estado"];
    const filas = filtrados.map((d) => [d.hc, d.paciente, fechaHora(d.fechaIngreso), d.tipoIngreso === "transferencia" ? "Transferencia" : "Normal", d.servicio, d.especialidad, d.cama, d.ubicacion ?? "", d.medico, d.financiamiento ?? "", d.diagnosticoCodigo ?? "", d.diagnostico ?? "", d.activo ? "Activo" : "Con egreso"]);
    const esc = (valor: string | number) => String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const tabla = `<table><thead><tr>${encabezados.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${filas.map((fila) => `<tr>${fila.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const html = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial;font-size:10pt}th,td{border:1px solid #b8c2cc;padding:6px}th{font-weight:bold;background:#e9eef3}</style></head><body><h2>Hospital Regional Eleazar Guzmán Barrón</h2><h3>Reporte de Ingresos Hospitalarios</h3><p>Período: ${desde || "—"} al ${hasta || "—"} | Registros: ${filas.length}</p>${tabla}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `ingresos-hospitalarios-${desde || "periodo"}-${hasta || "hoy"}.xls`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`@media print { .ingresos-no-print { display:none !important; } .ingresos-page { max-width:none !important; margin:0 !important; padding:0 !important; } .ingresos-print { display:block !important; } body { background:#fff !important; } @page { size:A4 landscape; margin:12mm; } } .ingresos-print { display:none; }`}</style>

      <div className="panel-page ingresos-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
        <section className="page-heading ingresos-no-print" style={{ marginBottom: 20 }}>
          <div className="panel-page-heading">
            <div>
              <p className="page-kicker">Información hospitalaria</p>
              <h1>Reporte de ingresos</h1>
              <p>Consulta los ingresos hospitalarios registrados por período, servicio y tipo de ingreso.</p>
            </div>
            <Link href="/reportes" style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}>← Centro de reportes</Link>
          </div>
        </section>

        <section className="ingresos-no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 20 }}>
          {[["Ingresos del período", datos.length, "↓"], ["Ingresos normales", normales, "N"], ["Transferencias", transferencias, "T"], ["Actualmente activos", activos, "●"]].map(([titulo, valor, icono]) => (
            <article key={String(titulo)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 15px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-soft)", color: "var(--primary)", display: "grid", placeItems: "center", fontWeight: 900 }}>{icono}</div>
              <div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{titulo}</div><strong style={{ display: "block", fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>{cargando ? "—" : valor}</strong></div>
            </article>
          ))}
        </section>

        <section className="ingresos-no-print" style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(150px, 1fr)) auto", gap: 10, alignItems: "end", padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>DESDE<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} /></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>HASTA<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} /></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>SERVICIO<select value={servicio} onChange={(e) => setServicio(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos los servicios</option>{servicios.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>TIPO DE INGRESO<select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos</option><option value="normal">Normal</option><option value="transferencia">Transferencia</option></select></label>
            <button type="button" onClick={consultar} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 12px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Consultar</button>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por paciente, HC, médico o diagnóstico..." style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} />
            <button type="button" onClick={limpiar} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>Limpiar</button>
          </div>
        </section>

        {error && <section className="ingresos-no-print" role="alert" style={{ marginBottom: 18, padding: "12px 15px", background: "var(--danger-light)", border: "1px solid #ecc7c4", borderRadius: 10, color: "var(--danger)", fontSize: 12 }}>{error}</section>}

        <section className="ingresos-no-print" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0, fontSize: 15 }}>Ingresos hospitalarios</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>{cargando ? "Consultando..." : `${filtrados.length} resultado${filtrados.length === 1 ? "" : "s"} mostrado${filtrados.length === 1 ? "" : "s"}`}</p></div>
            <div style={{ display: "flex", gap: 7 }}><button type="button" onClick={() => window.print()} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>🖨 Imprimir / PDF</button><button type="button" onClick={exportarExcel} disabled={cargando || filtrados.length === 0} style={{ border: "1px solid #4f7b58", background: "#fff", color: "#38633f", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: cargando || filtrados.length === 0 ? .5 : 1 }}>📊 Excel</button></div>
          </div>
          {cargando ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando ingresos...</div> : filtrados.length === 0 ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay ingresos que coincidan con los filtros seleccionados.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "#f8fafb" }}>{["Paciente / HC", "Ingreso", "Servicio / Especialidad", "Cama", "Tipo", "Médico", "Diagnóstico", "Estado"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((d) => <tr key={d.id} style={{ borderTop: "1px solid #edf1f3" }}><td style={{ padding: "8px 10px", minWidth: 175 }}><strong style={{ display: "block", fontSize: 11 }}>{d.paciente}</strong><span style={{ color: "var(--muted)", fontSize: 9 }}>HC {d.hc}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fechaCorta(d.fechaIngreso)}<span style={{ display: "block", color: "var(--muted)", fontSize: 9 }}>{new Date(d.fechaIngreso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span></td><td style={{ padding: "8px 10px", minWidth: 155 }}><strong>{d.servicio}</strong><span style={{ display: "block", color: "var(--muted)", fontSize: 9, marginTop: 2 }}>{d.especialidad}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>Cama {d.cama}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}><span style={{ padding: "3px 6px", borderRadius: 999, background: d.tipoIngreso === "transferencia" ? "var(--secondary-light)" : "var(--primary-light)", color: d.tipoIngreso === "transferencia" ? "var(--secondary)" : "var(--primary-dark)", fontSize: 8.5, fontWeight: 800 }}>{d.tipoIngreso === "transferencia" ? "Transferencia" : "Normal"}</span></td><td style={{ padding: "8px 10px", minWidth: 145 }}>{d.medico || "—"}</td><td style={{ padding: "8px 10px", minWidth: 190, maxWidth: 280 }}>{d.diagnosticoCodigo && <strong>{d.diagnosticoCodigo} · </strong>}<span style={{ color: "var(--muted)" }}>{d.diagnostico || "—"}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{d.activo ? <span style={{ padding: "3px 6px", borderRadius: 999, background: "#e8f3eb", color: "#38633f", fontSize: 8.5, fontWeight: 800 }}>Activo</span> : <span style={{ color: "var(--muted)", fontSize: 9 }}>Con egreso</span>}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="ingresos-print reportes-print">
          <header style={{ borderBottom: "2px solid #222", paddingBottom: 10, marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700 }}>HOSPITAL REGIONAL ELEAZAR GUZMÁN BARRÓN</div><div style={{ fontSize: 9, marginTop: 3 }}>Sistema de Censo Hospitalario</div><h1 style={{ fontSize: 17, margin: "14px 0 5px", textAlign: "center" }}>REPORTE DE INGRESOS HOSPITALARIOS</h1><div style={{ fontSize: 9, textAlign: "center" }}>Período: {desde || "—"} al {hasta || "—"}</div></header>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 9 }}><span><strong>Fecha de generación:</strong> {new Date().toLocaleString("es-PE")}</span><span><strong>Total:</strong> {filtrados.length}</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}><thead><tr>{["HC", "Paciente", "Fecha / hora", "Servicio / Especialidad", "Cama", "Tipo", "Médico", "Diagnóstico", "Estado"].map((h) => <th key={h} style={{ border: "1px solid #999", padding: "5px 6px", textAlign: "left", background: "#eee" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((d) => <tr key={d.id} style={{ pageBreakInside: "avoid" }}><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.hc}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.paciente}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{fechaHora(d.fechaIngreso)}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.servicio}<br />{d.especialidad}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.cama}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.tipoIngreso === "transferencia" ? "Transferencia" : "Normal"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.medico || "—"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.diagnosticoCodigo ? `${d.diagnosticoCodigo} · ` : ""}{d.diagnostico || "—"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.activo ? "Activo" : "Con egreso"}</td></tr>)}</tbody></table>
          <footer style={{ marginTop: 12, fontSize: 8, color: "#555" }}>Reporte generado por el Sistema de Censo Hospitalario.</footer>
        </section>
      </div>
    </>
  );
}
