"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Cama = {
  id: number;
  numero: string;
  estadoCama: string;
  estado: string;
  estadoTexto: string;
  ubicacion: string | null;
  servicioId: number;
  servicio: string;
  especialidadId: number;
  especialidad: string;
  ingresoId: number | null;
  hc: string | null;
  paciente: string | null;
  fechaIngreso: string | null;
  diasEstancia: number | null;
};

type Resumen = { total: number; ocupadas: number; libres: number; inoperativas: number };

function fechaHora(fecha: string | null) {
  if (!fecha) return "—";
  const v = new Date(fecha);
  return Number.isFinite(v.getTime()) ? v.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default function OcupacionReportPage() {
  const [datos, setDatos] = useState<Cama[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ total: 0, ocupadas: 0, libres: 0, inoperativas: 0 });
  const [servicio, setServicio] = useState("todos");
  const [especialidad, setEspecialidad] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const consultar = async () => {
    setCargando(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (servicio !== "todos") p.set("servicioId", servicio);
      if (especialidad !== "todos") p.set("especialidadId", especialidad);
      if (estado !== "todos") p.set("estado", estado);
      const r = await fetch(`/api/reportes/ocupacion?${p.toString()}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "No se pudo consultar el reporte de ocupación.");
      setDatos(d.datos ?? []);
      setResumen(d.resumen ?? { total: 0, ocupadas: 0, libres: 0, inoperativas: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");
      setDatos([]);
      setResumen({ total: 0, ocupadas: 0, libres: 0, inoperativas: 0 });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { consultar(); }, []);

  const servicios = useMemo(() => Array.from(new Map(datos.map((d) => [d.servicioId, { id: d.servicioId, nombre: d.servicio }])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre)), [datos]);
  const especialidades = useMemo(() => Array.from(new Map(datos.filter((d) => servicio === "todos" || String(d.servicioId) === servicio).map((d) => [d.especialidadId, { id: d.especialidadId, nombre: d.especialidad }])).values()).sort((a, b) => a.nombre.localeCompare(b.nombre)), [datos, servicio]);
  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return datos.filter((d) => !t || d.numero.toLowerCase().includes(t) || (d.paciente ?? "").toLowerCase().includes(t) || (d.hc ?? "").toLowerCase().includes(t));
  }, [datos, busqueda]);
  const porcentajeOcupacion = resumen.total ? ((resumen.ocupadas / resumen.total) * 100).toFixed(1) : "0.0";

  const limpiar = () => {
    setServicio("todos");
    setEspecialidad("todos");
    setEstado("todos");
    setBusqueda("");
    setTimeout(() => {
      fetch("/api/reportes/ocupacion", { cache: "no-store" }).then((r) => r.json()).then((d) => { setDatos(d.datos ?? []); setResumen(d.resumen ?? { total: 0, ocupadas: 0, libres: 0, inoperativas: 0 }); });
    }, 0);
  };

  const exportarExcel = () => {
    const headers = ["Cama", "Estado", "Servicio", "Especialidad", "Ubicación", "HC", "Paciente", "Fecha ingreso", "Días estancia"];
    const filas = filtrados.map((d) => [d.numero, d.estadoTexto, d.servicio, d.especialidad, d.ubicacion ?? "", d.hc ?? "", d.paciente ?? "", fechaHora(d.fechaIngreso), d.diasEstancia ?? ""]);
    const esc = (v: string | number) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const tabla = `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const html = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial;font-size:10pt}th,td{border:1px solid #b8c2cc;padding:6px}th{font-weight:bold;background:#e9eef3}</style></head><body><h2>Hospital Regional Eleazar Guzmán Barrón</h2><h3>Reporte de Ocupación de Camas</h3><p>Total: ${resumen.total} | Ocupadas: ${resumen.ocupadas} | Libres: ${resumen.libres} | Inoperativas: ${resumen.inoperativas}</p>${tabla}</body></html>`;
    const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocupacion-camas-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <style>{`@media print { .ocupacion-no-print{display:none!important}.ocupacion-page{max-width:none!important;margin:0!important;padding:0!important}.ocupacion-print{display:block!important}body{background:#fff!important}@page{size:A4 landscape;margin:12mm}}.ocupacion-print{display:none}`}</style>
    <div className="panel-page ocupacion-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
      <section className="page-heading ocupacion-no-print" style={{ marginBottom: 20 }}><div className="panel-page-heading"><div><p className="page-kicker">Información hospitalaria</p><h1>Reporte de ocupación de camas</h1><p>Estado y distribución de camas por servicio y especialidad.</p></div><Link href="/reportes" style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}>← Centro de reportes</Link></div></section>

      <section className="ocupacion-no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 10, marginBottom: 20 }}>
        {[["Camas totales", resumen.total, "▦"], ["Ocupadas", resumen.ocupadas, "●"], ["Libres", resumen.libres, "○"], ["Inoperativas", resumen.inoperativas, "×"], ["% ocupación", `${porcentajeOcupacion}%`, "%"]].map(([t, v, i]) => <article key={String(t)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 15px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-soft)", color: "var(--primary)", display: "grid", placeItems: "center", fontWeight: 900 }}>{i}</div><div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{t}</div><strong style={{ display: "block", fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>{cargando ? "—" : v}</strong></div></article>)}
      </section>

      <section className="ocupacion-no-print" style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(180px,1fr)) auto", gap: 10, alignItems: "end", padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
          <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>SERVICIO<select value={servicio} onChange={(e) => { setServicio(e.target.value); setEspecialidad("todos"); }} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos los servicios</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
          <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>ESPECIALIDAD<select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todas las especialidades</option>{especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
          <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>ESTADO<select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos</option><option value="ocupada">Ocupadas</option><option value="libre">Libres</option><option value="inoperativa">Inoperativas</option></select></label>
          <button type="button" onClick={consultar} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 12px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Consultar</button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por cama, paciente o HC..." style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} /><button type="button" onClick={limpiar} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>Limpiar</button></div>
      </section>

      {error && <section className="ocupacion-no-print" role="alert" style={{ marginBottom: 18, padding: "12px 15px", background: "var(--danger-light)", border: "1px solid #ecc7c4", borderRadius: 10, color: "var(--danger)", fontSize: 12 }}>{error}</section>}

      <section className="ocupacion-no-print" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 15 }}>Detalle de camas</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>{cargando ? "Consultando..." : `${filtrados.length} cama${filtrados.length === 1 ? "" : "s"} mostrada${filtrados.length === 1 ? "" : "s"}`}</p></div><div style={{ display: "flex", gap: 7 }}><button type="button" onClick={() => window.print()} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>🖨 Imprimir / PDF</button><button type="button" onClick={exportarExcel} disabled={cargando || filtrados.length === 0} style={{ border: "1px solid #4f7b58", background: "#fff", color: "#38633f", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: cargando || filtrados.length === 0 ? .5 : 1 }}>📊 Excel</button></div></div>
        {cargando ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando camas...</div> : filtrados.length === 0 ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay camas que coincidan con los filtros seleccionados.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "#f8fafb" }}>{["Cama","Estado","Servicio / Especialidad","Ubicación","Paciente / HC","Ingreso","Estancia"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((d) => <tr key={d.id} style={{ borderTop: "1px solid #edf1f3" }}><td style={{ padding: "8px 10px", fontWeight: 800 }}>Cama {d.numero}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}><span style={{ display: "inline-block", padding: "4px 7px", borderRadius: 999, background: d.estado === "ocupada" ? "#f7e7e7" : d.estado === "libre" ? "#e7f4ea" : "#f1ece3", color: d.estado === "ocupada" ? "#9b3e3e" : d.estado === "libre" ? "#356b43" : "#806238", fontSize: 9, fontWeight: 800 }}>{d.estadoTexto}</span></td><td style={{ padding: "8px 10px", minWidth: 160 }}><strong style={{ fontSize: 10.5 }}>{d.servicio}</strong><span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9 }}>{d.especialidad}</span></td><td style={{ padding: "8px 10px" }}>{d.ubicacion || "—"}</td><td style={{ padding: "8px 10px", minWidth: 180 }}>{d.paciente ? <><strong style={{ display: "block", fontSize: 10.5 }}>{d.paciente}</strong><span style={{ color: "var(--muted)", fontSize: 9 }}>HC {d.hc}</span></> : "—"}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fechaHora(d.fechaIngreso)}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 800 }}>{d.diasEstancia === null ? "—" : `${d.diasEstancia} d.`}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="ocupacion-print reportes-print"><header style={{ borderBottom: "2px solid #222", paddingBottom: 10, marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700 }}>HOSPITAL REGIONAL ELEAZAR GUZMÁN BARRÓN</div><div style={{ fontSize: 9, marginTop: 3 }}>Sistema de Censo Hospitalario</div><h1 style={{ fontSize: 17, margin: "14px 0 5px", textAlign: "center" }}>REPORTE DE OCUPACIÓN DE CAMAS</h1><div style={{ fontSize: 9, textAlign: "center" }}>Generado: {new Date().toLocaleString("es-PE")}</div></header><div style={{ display: "flex", gap: 20, marginBottom: 10, fontSize: 9 }}><span><strong>Total:</strong> {resumen.total}</span><span><strong>Ocupadas:</strong> {resumen.ocupadas}</span><span><strong>Libres:</strong> {resumen.libres}</span><span><strong>Inoperativas:</strong> {resumen.inoperativas}</span><span><strong>% ocupación:</strong> {porcentajeOcupacion}%</span></div><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}><thead><tr>{["Cama","Estado","Servicio / Especialidad","Ubicación","HC","Paciente","Ingreso","Estancia"].map((h) => <th key={h} style={{ border: "1px solid #999", padding: "5px 6px", textAlign: "left", background: "#eee" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((d) => <tr key={d.id} style={{ pageBreakInside: "avoid" }}><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.numero}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.estadoTexto}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.servicio}<br />{d.especialidad}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.ubicacion || "—"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.hc || "—"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.paciente || "—"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{fechaHora(d.fechaIngreso)}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{d.diasEstancia === null ? "—" : `${d.diasEstancia} d.`}</td></tr>)}</tbody></table></section>
    </div>
  </>;
}
