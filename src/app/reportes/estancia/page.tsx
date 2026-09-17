"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Registro = {
  ingresoId: number;
  hc: string;
  paciente: string;
  fechaIngreso: string;
  fechaEgreso: string | null;
  cama: string;
  especialidad: string;
  servicioId: number;
  servicio: string;
  tipoIngreso: string;
  tipoEgreso: string | null;
  estado: "activa" | "egresada";
  estadoTexto: string;
  diasEstancia: number;
  estanciaProlongada: boolean;
};

type Resumen = {
  total: number;
  activas: number;
  egresadas: number;
  prolongadas: number;
  promedio: number;
};

type Filtros = {
  desde: string;
  hasta: string;
  servicio: string;
  estado: string;
  minimo: string;
};

function fechaLocal(valor: Date) {
  return valor.toLocaleDateString("en-CA");
}

function fechaHora(fecha: string | null) {
  if (!fecha) return "—";
  const valor = new Date(fecha);
  return Number.isFinite(valor.getTime())
    ? valor.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
    : "—";
}

const resumenInicial: Resumen = {
  total: 0,
  activas: 0,
  egresadas: 0,
  prolongadas: 0,
  promedio: 0,
};

export default function EstanciaReportPage() {
  const hoy = useMemo(() => new Date(), []);
  const inicioMes = useMemo(
    () => new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    [hoy]
  );

  const [desde, setDesde] = useState(fechaLocal(inicioMes));
  const [hasta, setHasta] = useState(fechaLocal(hoy));
  const [servicio, setServicio] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [minimo, setMinimo] = useState("0");
  const [busqueda, setBusqueda] = useState("");
  const [datos, setDatos] = useState<Registro[]>([]);
  const [resumen, setResumen] = useState<Resumen>(resumenInicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const consultar = async (filtros?: Filtros) => {
    const f: Filtros = filtros ?? { desde, hasta, servicio, estado, minimo };
    setCargando(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (f.desde) params.set("desde", f.desde);
      if (f.hasta) params.set("hasta", f.hasta);
      if (f.servicio !== "todos") params.set("servicioId", f.servicio);
      if (f.estado !== "todos") params.set("estado", f.estado);
      if (f.minimo && f.minimo !== "0") params.set("minimo", f.minimo);

      const respuesta = await fetch(`/api/reportes/estancia?${params.toString()}`, {
        cache: "no-store",
      });
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado?.error || "No se pudo consultar el reporte de estancia.");
      }

      setDatos(Array.isArray(resultado.datos) ? resultado.datos : []);
      setResumen(resultado.resumen ?? resumenInicial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");
      setDatos([]);
      setResumen(resumenInicial);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    consultar();
    // La consulta inicial solo debe ejecutarse al montar el reporte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const servicios = useMemo(
    () =>
      Array.from(
        new Map(
          datos.map((d) => [d.servicioId, { id: d.servicioId, nombre: d.servicio }])
        ).values()
      ).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [datos]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return datos;

    return datos.filter(
      (d) =>
        d.paciente.toLowerCase().includes(termino) ||
        d.hc.toLowerCase().includes(termino) ||
        d.servicio.toLowerCase().includes(termino) ||
        d.especialidad.toLowerCase().includes(termino)
    );
  }, [datos, busqueda]);

  const limpiar = () => {
    const filtros: Filtros = {
      desde: fechaLocal(inicioMes),
      hasta: fechaLocal(hoy),
      servicio: "todos",
      estado: "todos",
      minimo: "0",
    };

    setDesde(filtros.desde);
    setHasta(filtros.hasta);
    setServicio(filtros.servicio);
    setEstado(filtros.estado);
    setMinimo(filtros.minimo);
    setBusqueda("");
    consultar(filtros);
  };

  const exportarExcel = () => {
    const encabezados = [
      "HC",
      "Paciente",
      "Servicio",
      "Especialidad",
      "Cama",
      "Fecha ingreso",
      "Fecha egreso",
      "Estado",
      "Días estancia",
      "Tipo ingreso",
      "Tipo egreso",
    ];

    const filas = filtrados.map((d) => [
      d.hc,
      d.paciente,
      d.servicio,
      d.especialidad,
      d.cama,
      fechaHora(d.fechaIngreso),
      fechaHora(d.fechaEgreso),
      d.estadoTexto,
      d.diasEstancia,
      d.tipoIngreso,
      d.tipoEgreso ?? "",
    ]);

    const esc = (valor: string | number) =>
      String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");

    const tabla = `<table><thead><tr>${encabezados
      .map((h) => `<th>${esc(h)}</th>`)
      .join("")}</tr></thead><tbody>${filas
      .map(
        (fila) =>
          `<tr>${fila.map((celda) => `<td>${esc(celda)}</td>`).join("")}</tr>`
      )
      .join("")}</tbody></table>`;

    const html = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial;font-size:10pt}th,td{border:1px solid #b8c2cc;padding:6px}th{font-weight:bold;background:#e9eef3}</style></head><body><h2>Hospital Regional Eleazar Guzmán Barrón</h2><h3>Reporte de Estancia Hospitalaria</h3><p>Período de ingreso: ${desde || "—"} al ${hasta || "—"} | Registros: ${filas.length}</p>${tabla}</body></html>`;

    const url = URL.createObjectURL(
      new Blob(["\ufeff", html], {
        type: "application/vnd.ms-excel;charset=utf-8",
      })
    );
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `estancia-hospitalaria-${desde || "periodo"}-${hasta || "hoy"}.xls`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`@media print { .estancia-no-print{display:none!important}.estancia-page{max-width:none!important;margin:0!important;padding:0!important}.estancia-print{display:block!important}body{background:#fff!important}@page{size:A4 landscape;margin:12mm}}.estancia-print{display:none}`}</style>

      <div className="panel-page estancia-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
        <section className="page-heading estancia-no-print" style={{ marginBottom: 20 }}>
          <div className="panel-page-heading">
            <div>
              <p className="page-kicker">Información hospitalaria</p>
              <h1>Reporte de estancia hospitalaria</h1>
              <p>
                Consulta los días de hospitalización, identifica estancias prolongadas y diferencia pacientes activos y egresados.
              </p>
            </div>
            <Link
              href="/reportes"
              style={{
                border: "1px solid var(--border)",
                background: "#fff",
                color: "var(--primary-dark)",
                borderRadius: 9,
                padding: "9px 13px",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "var(--shadow-sm)",
                whiteSpace: "nowrap",
              }}
            >
              ← Centro de reportes
            </Link>
          </div>
        </section>

        <section
          className="estancia-no-print"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            ["Registros", resumen.total, "▤"],
            ["Estancia promedio", `${resumen.promedio} d.`, "◷"],
            ["Estancias activas", resumen.activas, "●"],
            ["Estancias prolongadas", resumen.prolongadas, "!"],
            ["Egresadas", resumen.egresadas, "✓"],
          ].map(([titulo, valor, icono]) => (
            <article
              key={String(titulo)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "13px 15px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--surface-soft)",
                  color: "var(--primary)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
              >
                {icono}
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>
                  {titulo}
                </div>
                <strong style={{ display: "block", fontSize: 21, lineHeight: 1.1, marginTop: 3 }}>
                  {cargando ? "—" : valor}
                </strong>
              </div>
            </article>
          ))}
        </section>

        <section className="estancia-no-print" style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,minmax(135px,1fr)) auto",
              gap: 10,
              alignItems: "end",
              padding: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>
              DESDE
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} />
            </label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>
              HASTA
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} />
            </label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>
              SERVICIO
              <select value={servicio} onChange={(e) => setServicio(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}>
                <option value="todos">Todos los servicios</option>
                {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>
              ESTADO
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11, background: "#fff" }}>
                <option value="todos">Todos</option>
                <option value="activa">Activa</option>
                <option value="egresada">Egresada</option>
              </select>
            </label>
            <label style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>
              MÍNIMO DE DÍAS
              <input type="number" min="0" value={minimo} onChange={(e) => setMinimo(e.target.value)} style={{ display: "block", width: "100%", marginTop: 5, padding: "8px 9px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} />
            </label>
            <button type="button" onClick={() => consultar()} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 12px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              Consultar
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por paciente, HC, servicio o especialidad..." style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 7, font: "inherit", fontSize: 11 }} />
            <button type="button" onClick={limpiar} style={{ border: "1px solid var(--border)", background: "#fff", color: "var(--muted)", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
              Limpiar
            </button>
          </div>
        </section>

        {error && (
          <section className="estancia-no-print" role="alert" style={{ marginBottom: 18, padding: "12px 15px", background: "var(--danger-light)", border: "1px solid #ecc7c4", borderRadius: 10, color: "var(--danger)", fontSize: 12 }}>
            {error}
          </section>
        )}

        <section className="estancia-no-print" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15 }}>Detalle de estancias</h2>
              <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: 10 }}>
                {cargando
                  ? "Consultando..."
                  : filtrados.length + " resultado" + (filtrados.length === 1 ? "" : "s") + " mostrado" + (filtrados.length === 1 ? "" : "s")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button type="button" onClick={() => window.print()} style={{ border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                🖨 Imprimir / PDF
              </button>
              <button type="button" onClick={exportarExcel} disabled={cargando || filtrados.length === 0} style={{ border: "1px solid #4f7b58", background: "#fff", color: "#38633f", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: cargando || filtrados.length === 0 ? 0.5 : 1 }}>
                📊 Excel
              </button>
            </div>
          </div>

          {cargando ? (
            <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>Cargando estancias...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: 22, color: "var(--muted)", fontSize: 12 }}>No hay registros que coincidan con los filtros seleccionados.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                <thead>
                  <tr style={{ background: "#f8fafb" }}>
                    {["Paciente / HC", "Servicio / Especialidad", "Cama", "Ingreso", "Egreso", "Estado", "Estancia"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((d) => (
                    <tr key={d.ingresoId} style={{ borderTop: "1px solid #edf1f3" }}>
                      <td style={{ padding: "8px 10px", minWidth: 180 }}><strong style={{ display: "block", fontSize: 11 }}>{d.paciente}</strong><span style={{ color: "var(--muted)", fontSize: 9 }}>HC {d.hc}</span></td>
                      <td style={{ padding: "8px 10px", minWidth: 155 }}><strong style={{ fontSize: 10.5 }}>{d.servicio}</strong><span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 9 }}>{d.especialidad}</span></td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>Cama {d.cama}</td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fechaHora(d.fechaIngreso)}</td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fechaHora(d.fechaEgreso)}</td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{d.estadoTexto}</td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 800 }}>{d.diasEstancia} d.{d.estanciaProlongada ? " · ≥15 d." : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="estancia-print reportes-print">
          <header style={{ borderBottom: "2px solid #222", paddingBottom: 8, marginBottom: 10 }}>
            <div style={{ textAlign: "center" }}>
              <strong style={{ fontSize: 15 }}>HOSPITAL REGIONAL ELEAZAR GUZMÁN BARRÓN</strong>
              <div style={{ fontSize: 10 }}>Sistema de Censo Hospitalario</div>
              <strong style={{ display: "block", fontSize: 12, marginTop: 4 }}>REPORTE DE ESTANCIA HOSPITALARIA</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9 }}>
              <span>Período de ingreso: {desde || "—"} al {hasta || "—"}</span>
              <span>Generado: {new Date().toLocaleString("es-PE")}</span>
            </div>
          </header>
          <div style={{ display: "flex", gap: 18, marginBottom: 8, fontSize: 9 }}>
            <span>Total: <strong>{filtrados.length}</strong></span>
            <span>Promedio: <strong>{resumen.promedio} d.</strong></span>
            <span>Activas: <strong>{resumen.activas}</strong></span>
            <span>Egresadas: <strong>{resumen.egresadas}</strong></span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
            <thead><tr>{["Paciente / HC", "Servicio / Especialidad", "Cama", "Ingreso", "Egreso", "Estado", "Estancia"].map((h) => <th key={h} style={{ border: "1px solid #444", padding: 4, textAlign: "left" }}>{h}</th>)}</tr></thead>
            <tbody>{filtrados.map((d) => <tr key={d.ingresoId}><td style={{ border: "1px solid #777", padding: 4 }}>{d.paciente}<br />HC {d.hc}</td><td style={{ border: "1px solid #777", padding: 4 }}>{d.servicio}<br />{d.especialidad}</td><td style={{ border: "1px solid #777", padding: 4 }}>Cama {d.cama}</td><td style={{ border: "1px solid #777", padding: 4 }}>{fechaHora(d.fechaIngreso)}</td><td style={{ border: "1px solid #777", padding: 4 }}>{fechaHora(d.fechaEgreso)}</td><td style={{ border: "1px solid #777", padding: 4 }}>{d.estadoTexto}</td><td style={{ border: "1px solid #777", padding: 4 }}>{d.diasEstancia} d.{d.estanciaProlongada ? " · ≥15 d." : ""}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </>
  );
}
