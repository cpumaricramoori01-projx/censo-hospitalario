// src/app/egresos/nuevo/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IngresoActivo = {
  ingresoId: number;
  hc: string;
  dni: string | null;
  camaId: number;
  fechaIngreso: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  numeroCama: string;
  especialidadNombre: string;
  servicioNombre: string;
};

type Servicio = { id: number; nombre: string };

type Medico = {
  id: number;
  cmp: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  especialidad: string | null;
  servicio: string;
};

type Diagnostico = {
  id: number;
  codigo: string;
  descripcion: string;
};

const TIPOS_EGRESO = [
  { value: "alta_medica", label: "Alta médica" },
  { value: "alta_voluntaria", label: "Alta voluntaria" },
  { value: "fallecido", label: "Fallecido" },
  { value: "transferencia", label: "Transferencia" },
  { value: "retiro", label: "Retiro" },
  { value: "otro", label: "Otro" },
];

export default function NuevoEgresoPage() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<IngresoActivo[]>([]);
  const [seleccionado, setSeleccionado] = useState<IngresoActivo | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tipoEgreso, setTipoEgreso] = useState("");
  const [servicioDestinoId, setServicioDestinoId] = useState("");

  const [medicoAlta, setMedicoAlta] = useState("");
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [buscandoMedicos, setBuscandoMedicos] = useState(false);
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<Medico | null>(null);

  const [diagnosticoFinal, setDiagnosticoFinal] = useState("");
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [buscandoDiagnosticos, setBuscandoDiagnosticos] = useState(false);
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<Diagnostico | null>(null);

  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then(setServicios)
      .catch(() => setServicios([]));
  }, []);

  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setResultados([]);
      setSeleccionado(null);
      setBuscando(false);
      return;
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      setSeleccionado(null);
      setMensaje(null);
      try {
        const res = await fetch(`/api/ingresos/activos?q=${encodeURIComponent(termino)}`, { signal: controlador.signal });
        if (!res.ok) throw new Error("No se pudo consultar las hospitalizaciones activas");
        const data = await res.json();
        setResultados(data);
        if (data.length === 0) setMensaje("⚠️ No se encontró ninguna hospitalización activa con ese dato");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setResultados([]);
        setMensaje("❌ No se pudo realizar la búsqueda");
      } finally {
        if (!controlador.signal.aborted) setBuscando(false);
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [busqueda]);

  useEffect(() => {
    const termino = medicoAlta.trim();
    if (medicoSeleccionado) {
      const nombre = `${medicoSeleccionado.nombres} ${medicoSeleccionado.apellidoPaterno} ${medicoSeleccionado.apellidoMaterno ?? ""}`.trim();
      if (termino !== nombre) setMedicoSeleccionado(null);
    }
    if (termino.length < 2) {
      setMedicos([]);
      setBuscandoMedicos(false);
      return;
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      setBuscandoMedicos(true);
      try {
        const res = await fetch(`/api/medicos?q=${encodeURIComponent(termino)}`, { signal: controlador.signal });
        if (!res.ok) throw new Error("No se pudieron consultar los médicos");
        setMedicos(await res.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setMedicos([]);
      } finally {
        if (!controlador.signal.aborted) setBuscandoMedicos(false);
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [medicoAlta, medicoSeleccionado]);

  useEffect(() => {
    const termino = diagnosticoFinal.trim();
    if (diagnosticoSeleccionado) {
      const valor = `${diagnosticoSeleccionado.codigo} - ${diagnosticoSeleccionado.descripcion}`;
      if (termino !== valor) setDiagnosticoSeleccionado(null);
    }
    if (termino.length < 2) {
      setDiagnosticos([]);
      setBuscandoDiagnosticos(false);
      return;
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      setBuscandoDiagnosticos(true);
      try {
        const res = await fetch(`/api/diagnosticos?q=${encodeURIComponent(termino)}`, { signal: controlador.signal });
        if (!res.ok) throw new Error("No se pudieron consultar los diagnósticos");
        setDiagnosticos(await res.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setDiagnosticos([]);
      } finally {
        if (!controlador.signal.aborted) setBuscandoDiagnosticos(false);
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [diagnosticoFinal, diagnosticoSeleccionado]);

  function seleccionarPaciente(ingreso: IngresoActivo) {
    setSeleccionado(ingreso);
    setMensaje(null);
  }

  function seleccionarMedico(medico: Medico) {
    const nombre = `${medico.nombres} ${medico.apellidoPaterno} ${medico.apellidoMaterno ?? ""}`.trim();
    setMedicoAlta(nombre);
    setMedicoSeleccionado(medico);
    setMedicos([]);
  }

  function seleccionarDiagnostico(diagnostico: Diagnostico) {
    setDiagnosticoFinal(`${diagnostico.codigo} - ${diagnostico.descripcion}`);
    setDiagnosticoSeleccionado(diagnostico);
    setDiagnosticos([]);
  }

  function limpiarBusqueda() {
    setBusqueda("");
    setResultados([]);
    setSeleccionado(null);
    setMensaje(null);
  }

  async function registrarEgreso() {
    if (!seleccionado) return;
    setEnviando(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/egresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingresoId: seleccionado.ingresoId,
          tipoEgreso,
          servicioDestinoId: servicioDestinoId ? Number(servicioDestinoId) : undefined,
          medicoAlta: medicoAlta || undefined,
          diagnosticoFinal: diagnosticoFinal || undefined,
          notas: notas.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMensaje(`✅ Egreso registrado correctamente (id ${data.id}). La cama quedó libre.`);
        limpiarBusqueda();
        setTipoEgreso("");
        setServicioDestinoId("");
        setMedicoAlta("");
        setMedicos([]);
        setMedicoSeleccionado(null);
        setDiagnosticoFinal("");
        setDiagnosticos([]);
        setDiagnosticoSeleccionado(null);
        setNotas("");
      } else {
        setMensaje(`❌ ${data.error}`);
      }
    } catch (err) {
      setMensaje(`❌ Error de red: ${String(err)}`);
    } finally {
      setEnviando(false);
    }
  }

  const transferenciaValida = tipoEgreso !== "transferencia" || !!servicioDestinoId;
  const listo =
    !!seleccionado &&
    !!tipoEgreso &&
    !!medicoSeleccionado &&
    !!diagnosticoSeleccionado &&
    transferenciaValida;

  return (
    <div className="form-page">
      <header className="page-heading page-heading-with-action">
        <div>
          <p className="page-kicker">Gestión de altas</p>
          <h1>Registrar egreso</h1>
          <p>Registra la salida del paciente y actualiza automáticamente la disponibilidad de su cama.</p>
        </div>
        <Link href="/panel" className="page-heading-action">← Volver al panel</Link>
      </header>

      <div className="form-card">
        <section className="form-section">
          <div className="form-section-title">01 · Buscar paciente</div>
          <p className="form-section-description">Busca una hospitalización activa por historia clínica, DNI, nombres o apellidos.</p>
          <div className="form-field">
            <label className="form-label">Paciente hospitalizado</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="HC, DNI, nombres o apellidos..." className="form-input" />
              <button type="button" onClick={limpiarBusqueda} disabled={!busqueda && !seleccionado} className="btn btn-secondary">Limpiar</button>
            </div>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>La búsqueda se realiza automáticamente desde 2 caracteres y solo muestra pacientes con hospitalización activa.</p>
        </section>

        {buscando && <section className="form-section"><p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Buscando hospitalizaciones activas...</p></section>}

        {resultados.length > 0 && (
          <section className="form-section">
            <div className="form-section-title">02 · Hospitalizaciones encontradas</div>
            <p className="form-section-description">Selecciona la estancia hospitalaria correspondiente.</p>
            <div style={{ display: "grid", gap: 10 }}>
              {resultados.map((r) => {
                const estaSeleccionado = seleccionado?.ingresoId === r.ingresoId;
                return (
                  <button key={r.ingresoId} type="button" onClick={() => seleccionarPaciente(r)} style={{ width: "100%", textAlign: "left", cursor: "pointer", border: estaSeleccionado ? "2px solid var(--success)" : "1px solid var(--border)", borderRadius: 10, padding: 16, background: estaSeleccionado ? "var(--success-light)" : "white", boxShadow: estaSeleccionado ? "0 0 0 3px rgba(22,128,91,0.08)" : "var(--shadow-sm)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>{r.nombres} {r.apellidoPaterno} {r.apellidoMaterno ?? ""}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>HC: <strong>{r.hc}</strong>{r.dni ? <> · DNI: <strong>{r.dni}</strong></> : null}</div>
                      </div>
                      <div style={{ padding: "5px 9px", borderRadius: 999, background: estaSeleccionado ? "#d5f1e3" : "#eef2f6", color: estaSeleccionado ? "var(--success)" : "#536171", fontSize: 11, fontWeight: 700 }}>{estaSeleccionado ? "SELECCIONADO" : "ACTIVO"}</div>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ padding: "6px 9px", borderRadius: 7, background: "#f4f6f8", fontSize: 12, color: "#465467" }}>{r.servicioNombre}</span>
                      <span style={{ padding: "6px 9px", borderRadius: 7, background: "#f4f6f8", fontSize: 12, color: "#465467" }}>{r.especialidadNombre}</span>
                      <span style={{ padding: "6px 9px", borderRadius: 7, background: "#e8f3f7", color: "var(--primary-dark)", fontSize: 12, fontWeight: 600 }}>Cama {r.numeroCama}</span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>Ingresó: {new Date(r.fechaIngreso).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {seleccionado && (
          <>
            <section className="form-section">
              <div className="form-section-title">03 · Datos del egreso</div>
              <p className="form-section-description">Registra el motivo y los datos correspondientes a la salida del paciente.</p>

              <div className="form-field">
                <label className="form-label">Tipo de egreso</label>
                <select value={tipoEgreso} onChange={(e) => setTipoEgreso(e.target.value)} className="form-select">
                  <option value="">Selecciona...</option>
                  {TIPOS_EGRESO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {tipoEgreso === "transferencia" && (
                <div className="form-field">
                  <label className="form-label">Servicio de destino</label>
                  <select value={servicioDestinoId} onChange={(e) => setServicioDestinoId(e.target.value)} className="form-select">
                    <option value="">Selecciona el servicio de destino</option>
                    {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}

              <div className="form-field">
                <label className="form-label">Médico de alta</label>
                <input type="text" value={medicoAlta} onChange={(e) => setMedicoAlta(e.target.value)} placeholder="Buscar médico por nombre o CMP..." className="form-input" autoComplete="off" />
                {buscandoMedicos && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>Buscando médicos...</p>}
                {medicos.length > 0 && (
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {medicos.map((m) => (
                      <button key={m.id} type="button" onClick={() => seleccionarMedico(m)} style={{ width: "100%", textAlign: "left", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "white", cursor: "pointer" }}>
                        <strong>{m.nombres} {m.apellidoPaterno} {m.apellidoMaterno ?? ""}</strong>
                        <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "var(--muted)" }}>CMP: {m.cmp} · {m.especialidad ?? "Sin especialidad"} · {m.servicio}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">Diagnóstico final</label>
                <input type="text" value={diagnosticoFinal} onChange={(e) => setDiagnosticoFinal(e.target.value)} placeholder="Buscar diagnóstico por código o descripción..." className="form-input" autoComplete="off" />
                {buscandoDiagnosticos && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>Buscando diagnósticos...</p>}
                {diagnosticos.length > 0 && (
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {diagnosticos.map((d) => (
                      <button key={d.id} type="button" onClick={() => seleccionarDiagnostico(d)} style={{ width: "100%", textAlign: "left", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "white", cursor: "pointer" }}>
                        <strong>{d.codigo}</strong>
                        <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "var(--muted)" }}>{d.descripcion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">Notas adicionales <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional)</span></label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones o información adicional del egreso..." className="form-input" rows={4} />
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={registrarEgreso} disabled={!listo || enviando} className="btn btn-primary">
                  {enviando ? "Registrando..." : "Registrar egreso"}
                </button>
              </div>
            </section>
          </>
        )}

        {mensaje && (
          <section className="form-section">
            <p style={{ margin: 0, fontSize: 13 }}>{mensaje}</p>
          </section>
        )}
      </div>
    </div>
  );
}
