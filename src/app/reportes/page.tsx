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
              <p>Consulta, filtra, imprime y exporta información del sistema.</p>
            </div>
            <Link href="/panel" style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--primary-dark)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}>← Panel principal</Link>
          </div>
        </section>

        <section className="reportes-no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 22 }}>
          {[
            ["Pacientes hospitalizados", pacientes.length, "●", "var(--primary)"],
            ["Resultados filtrados", filtrados.length, "⌕", "var(--secondary)"],
            ["Servicios", servicios.length, "▦", "#7563a8"],
            ["Con O₂ / VENT", pacientes.filter((p) => p.usaOxigeno || p.usaVentilador).length, "⚕", "#b66a2c"],
          ].map(([titulo, valor, icono, color]) => (
            <article key={String(titulo)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 15px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-soft)", color: String(color), display: "grid", placeItems: "center", fontWeight: 900 }}>{icono}</div>
              <div><div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{titulo}</div><strong style={{ display: "block", fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>{cargando ? "—" : valor}</strong></div>
            </article>
          ))}
        </section>

        <section className="reportes-no-print" style={{ marginBottom: 26 }}>
  <div className="section-heading" style={{ marginBottom: 14 }}>
    <div>
      <h2>Reportes disponibles</h2>
      <p>
        Seleccione el tipo de información que desea consultar,
        filtrar, imprimir o exportar.
      </p>
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))",
      gap: 14,
    }}
  >
    {reportesDisponibles.map((r) => (
      <Link
        key={r.titulo}
        href={r.href}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: 185,
          padding: 18,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-sm)",
          textDecoration: "none",
          color: "inherit",
          overflow: "hidden",
          transition:
            "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow =
            "0 10px 25px rgba(0,0,0,.10)";
          e.currentTarget.style.borderColor = "var(--primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background:
              r.color === "blue"
                ? "#2563eb"
                : r.color === "green"
                ? "#16834b"
                : r.color === "orange"
                ? "#d97706"
                : r.color === "purple"
                ? "#7c3aed"
                : "#c2410c",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div
            className={`dashboard-card-icon ${r.color}`}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              fontSize: 21,
              flexShrink: 0,
            }}
          >
            {r.icono}
          </div>

          <span
            style={{
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: ".05em",
              color: "var(--primary)",
              background: "var(--primary-light)",
              padding: "5px 8px",
              borderRadius: 999,
            }}
          >
            DISPONIBLE
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.2,
              fontWeight: 800,
            }}
          >
            {r.titulo}
          </h3>

          <p
            style={{
              margin: "7px 0 0",
              fontSize: 10.5,
              lineHeight: 1.5,
              color: "var(--muted)",
            }}
          >
            {r.descripcion}
          </p>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "var(--muted)",
            }}
          >
            REPORTE HOSPITALARIO
          </span>

          <span
            style={{
              fontSize: 10.5,
              fontWeight: 900,
              color: "var(--primary)",
            }}
          >
            Ver reporte →
          </span>
        </div>
      </Link>
    ))}
  </div>
</section>

<section className="reportes-no-print" style={{ marginBottom: 18 }}>
          <div className="section-heading" style={{ marginBottom: 12 }}><div><h2>Censo actual</h2><p>Pacientes que actualmente no tienen un egreso registrado.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.5fr) repeat(2, minmax(180px, 1fr)) auto", gap: 10, alignItems: "end", padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-sm)" }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>BUSCAR PACIENTE / HC / DIAGNÓSTICO<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escriba para buscar..." style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} /></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>SERVICIO<select value={servicio} onChange={(e) => { setServicio(e.target.value); setEspecialidad("todos"); }} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todos los servicios</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>ESPECIALIDAD<select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}><option value="todos">Todas las especialidades</option>{especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
            <button type="button" onClick={limpiarFiltros} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Limpiar</button>
          </div>
        </section>

        {error && <section role="alert" className="reportes-no-print" style={{ marginBottom: 18, padding: "12px 15px", background: "var(--danger-light)", border: "1px solid #ecc7c4", borderRadius: 10, color: "var(--danger)", fontSize: 12 }}>{error}</section>}

        <section className="reportes-no-print" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0, fontSize: 15 }}>Hospitalización actual</h2><p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>Resultado: {cargando ? "consultando..." : `${filtrados.length} paciente${filtrados.length === 1 ? "" : "s"}`}</p></div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button type="button" onClick={() => window.print()} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>🖨 Imprimir / PDF</button>
              <button type="button" onClick={exportarExcel} disabled={cargando || filtrados.length === 0} style={{ border: "1px solid #4f7b58", background: "#fff", color: "#38633f", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: cargando || filtrados.length === 0 ? .5 : 1 }}>📊 Excel</button>
            </div>
          </div>
          {cargando ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando pacientes hospitalizados...</div> : filtrados.length === 0 ? <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay pacientes que coincidan con los filtros seleccionados.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}><thead><tr style={{ background: "#f8fafb" }}>{["Paciente / HC", "Servicio / Especialidad", "Cama", "Ingreso", "Estancia", "Diagnóstico", "Soporte respiratorio"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filtrados.map((p) => <tr key={p.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}><td style={{ padding: "8px 10px", minWidth: 170 }}><strong style={{ display: "block", fontSize: 11 }}>{p.paciente}</strong><span style={{ color: "var(--muted)", fontSize: 9 }}>HC {p.hc}</span></td><td style={{ padding: "8px 10px", minWidth: 155 }}><strong style={{ fontSize: 10.5 }}>{p.servicio.nombre}</strong><span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9 }}>{p.especialidad.nombre}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>Cama {p.cama.numero}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fechaCorta(p.fechaIngreso)}</td><td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 800 }}>{diasEstancia(p.fechaIngreso)} d.</td><td style={{ padding: "8px 10px", minWidth: 200, maxWidth: 280 }}>{p.diagnostico.codigo && <strong>{p.diagnostico.codigo} · </strong>}<span style={{ color: "var(--muted)" }}>{p.diagnostico.descripcion || "—"}</span></td><td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{p.usaOxigeno && <span style={{ marginRight: 4, padding: "3px 6px", borderRadius: 999, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: 8.5, fontWeight: 800 }}>Oxígeno</span>}{p.usaVentilador && <span style={{ padding: "3px 6px", borderRadius: 999, background: "var(--secondary-light)", color: "var(--secondary)", fontSize: 8.5, fontWeight: 800 }}>Ventilador</span>}{!p.usaOxigeno && !p.usaVentilador && "Sin soporte"}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="reportes-print">
          <header style={{ borderBottom: "2px solid #222", paddingBottom: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>HOSPITAL REGIONAL ELEAZAR GUZMÁN BARRÓN</div>
            <div style={{ fontSize: 9, marginTop: 3 }}>Sistema de Censo Hospitalario</div>
            <h1 style={{ fontSize: 17, margin: "14px 0 5px", textAlign: "center" }}>REPORTE DE CENSO HOSPITALARIO</h1>
            <div style={{ fontSize: 9, textAlign: "center" }}>Censo actual de pacientes hospitalizados</div>
          </header>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 9 }}>
            <span><strong>Fecha de generación:</strong> {new Date().toLocaleString("es-PE")}</span>
            <span><strong>Total de pacientes:</strong> {filtrados.length}</span>
          </div>
          {(busqueda || servicio !== "todos" || especialidad !== "todos") && <div style={{ marginBottom: 10, padding: 7, border: "1px solid #bbb", fontSize: 8 }}><strong>Filtros aplicados:</strong>{busqueda && ` búsqueda “${busqueda}”`}{servicio !== "todos" && ` · servicio: ${servicios.find((s) => String(s.id) === servicio)?.nombre ?? servicio}`}{especialidad !== "todos" && ` · especialidad: ${especialidades.find((e) => String(e.id) === especialidad)?.nombre ?? especialidad}`}</div>}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
            <thead><tr>{["HC", "Paciente", "Servicio / Especialidad", "Cama", "Ingreso", "Estancia", "Diagnóstico", "Soporte respiratorio"].map((h) => <th key={h} style={{ border: "1px solid #999", padding: "5px 6px", textAlign: "left", background: "#eee" }}>{h}</th>)}</tr></thead>
            <tbody>{filtrados.map((p) => <tr key={p.ingresoId} style={{ pageBreakInside: "avoid" }}><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{p.hc}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{p.paciente}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{p.servicio.nombre}<br />{p.especialidad.nombre}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{p.cama.numero}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{fechaCorta(p.fechaIngreso)}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{diasEstancia(p.fechaIngreso)} días</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{p.diagnostico.codigo ? `${p.diagnostico.codigo} · ` : ""}{p.diagnostico.descripcion || "—"}</td><td style={{ border: "1px solid #999", padding: "5px 6px" }}>{[p.usaOxigeno ? "Oxígeno" : "", p.usaVentilador ? "Ventilador" : ""].filter(Boolean).join(" / ") || "Sin soporte"}</td></tr>)}</tbody>
          </table>
          <footer style={{ borderTop: "1px solid #999", marginTop: 12, paddingTop: 7, fontSize: 8, display: "flex", justifyContent: "space-between" }}><span>Total de pacientes hospitalizados: <strong>{filtrados.length}</strong></span><span>Documento generado por el Sistema de Censo Hospitalario</span></footer>
        </section>
      </div>
    </>
  );
}
