// src/app/egresos/nuevo/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const [busquedaMedico, setBusquedaMedico] = useState("");
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [buscandoMedicos, setBuscandoMedicos] = useState(false);
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<Medico | null>(null);
  const [medicoAbierto, setMedicoAbierto] = useState(false);
  const medicoRef = useRef<HTMLDivElement | null>(null);

  const [diagnosticoFinal, setDiagnosticoFinal] = useState("");
  const [busquedaDiagnostico, setBusquedaDiagnostico] = useState("");
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [buscandoDiagnosticos, setBuscandoDiagnosticos] = useState(false);
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<Diagnostico | null>(null);
  const [diagnosticoAbierto, setDiagnosticoAbierto] = useState(false);
  const diagnosticoRef = useRef<HTMLDivElement | null>(null);

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
    const termino = busquedaMedico.trim();

    if (termino.length < 2) {
      setMedicos([]);
      setBuscandoMedicos(false);
      return;
    }

    const controlador = new AbortController();

    const temporizador = setTimeout(async () => {
      setBuscandoMedicos(true);

      try {
        const res = await fetch(
          `/api/medicos?q=${encodeURIComponent(termino)}`,
          { signal: controlador.signal }
        );

        if (!res.ok) {
          throw new Error("No se pudieron consultar los médicos");
        }

        setMedicos(await res.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        console.error(err);
        setMedicos([]);
      } finally {
        if (!controlador.signal.aborted) {
          setBuscandoMedicos(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [busquedaMedico]);

  useEffect(() => {
    function manejarClickFuera(event: MouseEvent) {
      if (
        medicoRef.current &&
        !medicoRef.current.contains(event.target as Node)
      ) {
        setMedicoAbierto(false);
      }
    }

    document.addEventListener("mousedown", manejarClickFuera);

    return () => {
      document.removeEventListener("mousedown", manejarClickFuera);
    };
  }, []);

  useEffect(() => {
    const termino = busquedaDiagnostico.trim();

    if (termino.length < 2) {
      setDiagnosticos([]);
      setBuscandoDiagnosticos(false);
      return;
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(async () => {
      setBuscandoDiagnosticos(true);

      try {
        const res = await fetch(
          `/api/diagnosticos?q=${encodeURIComponent(termino)}`,
          { signal: controlador.signal }
        );

        if (!res.ok) {
          throw new Error("No se pudieron consultar los diagnósticos");
        }

        setDiagnosticos(await res.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        console.error(err);
        setDiagnosticos([]);
      } finally {
        if (!controlador.signal.aborted) {
          setBuscandoDiagnosticos(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [busquedaDiagnostico]);

  useEffect(() => {
    function manejarClickFuera(event: MouseEvent) {
      if (
        diagnosticoRef.current &&
        !diagnosticoRef.current.contains(event.target as Node)
      ) {
        setDiagnosticoAbierto(false);
      }
    }

    document.addEventListener("mousedown", manejarClickFuera);

    return () => {
      document.removeEventListener("mousedown", manejarClickFuera);
    };
  }, []);

  function seleccionarPaciente(ingreso: IngresoActivo) {
    setSeleccionado(ingreso);
    setMensaje(null);
  }

  function seleccionarMedico(medico: Medico) {
    const nombre = `${medico.nombres} ${medico.apellidoPaterno} ${medico.apellidoMaterno ?? ""}`.trim();

    setMedicoAlta(nombre);
    setMedicoSeleccionado(medico);
    setBusquedaMedico("");
    setMedicos([]);
    setMedicoAbierto(false);
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

              <div
                className="form-field"
                ref={medicoRef}
                style={{ position: "relative" }}
              >
                <label className="form-label">Médico de alta</label>

                {medicoAlta ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #b8e2d0",
                      background: "var(--success-light)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {medicoAlta}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Médico seleccionado
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMedicoAlta("");
                        setMedicoSeleccionado(null);
                        setBusquedaMedico("");
                        setMedicos([]);
                        setMedicoAbierto(false);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px" }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={busquedaMedico}
                      onFocus={() => {
                        if (busquedaMedico.trim().length >= 2) {
                          setMedicoAbierto(true);
                        }
                      }}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setBusquedaMedico(valor);
                        setMedicoAbierto(valor.trim().length >= 2);
                      }}
                      placeholder="Buscar médico por nombre o CMP..."
                      className="form-input"
                      autoComplete="off"
                    />

                    {buscandoMedicos && medicoAbierto && (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 30,
                          left: 0,
                          right: 0,
                          top: "100%",
                          marginTop: 4,
                          background: "#fff",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Buscando médicos...
                      </div>
                    )}

                    {!buscandoMedicos &&
                      medicoAbierto &&
                      medicos.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 30,
                            left: 0,
                            right: 0,
                            top: "100%",
                            marginTop: 4,
                            background: "#fff",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            maxHeight: 280,
                            overflowY: "auto",
                          }}
                        >
                          {medicos.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => seleccionarMedico(m)}
                              style={{
                                width: "100%",
                                display: "block",
                                textAlign: "left",
                                padding: "11px 12px",
                                border: "none",
                                borderBottom: "1px solid var(--border)",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                {m.nombres} {m.apellidoPaterno}{" "}
                                {m.apellidoMaterno ?? ""}
                              </div>

                              <div
                                style={{
                                  marginTop: 3,
                                  fontSize: 12,
                                  color: "var(--muted)",
                                }}
                              >
                                {m.especialidad ?? "Sin especialidad"} ·{" "}
                                {m.servicio}
                              </div>

                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 11,
                                  color: "var(--muted)",
                                }}
                              >
                                CMP: {m.cmp}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                    {!buscandoMedicos &&
                      medicoAbierto &&
                      busquedaMedico.trim().length >= 2 &&
                      medicos.length === 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "var(--muted)",
                          }}
                        >
                          No se encontraron médicos.
                        </div>
                      )}
                  </>
                )}
              </div>

                         <div
                className="form-field"
                ref={diagnosticoRef}
                style={{ position: "relative" }}
              >
                <label className="form-label">Diagnóstico final</label>

                {diagnosticoSeleccionado ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #b8e2d0",
                      background: "var(--success-light)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {diagnosticoSeleccionado.codigo}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {diagnosticoSeleccionado.descripcion}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Diagnóstico seleccionado
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDiagnosticoSeleccionado(null);
                        setDiagnosticoFinal("");
                        setBusquedaDiagnostico("");
                        setDiagnosticoAbierto(false);
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={busquedaDiagnostico}
                      onFocus={() => {
                        if (busquedaDiagnostico.trim().length >= 2) {
                          setDiagnosticoAbierto(true);
                        }
                      }}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setBusquedaDiagnostico(valor);
                        setDiagnosticoAbierto(valor.trim().length >= 2);
                      }}
                      placeholder="Buscar diagnóstico por código o descripción..."
                      className="form-input"
                      autoComplete="off"
                    />

                    {buscandoDiagnosticos && diagnosticoAbierto && (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 30,
                          left: 0,
                          right: 0,
                          top: "100%",
                          marginTop: 4,
                          background: "#fff",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          padding: "10px 12px",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Buscando diagnósticos...
                      </div>
                    )}

                    {!buscandoDiagnosticos &&
                      diagnosticoAbierto &&
                      diagnosticos.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 30,
                            left: 0,
                            right: 0,
                            top: "100%",
                            marginTop: 4,
                            background: "#fff",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            maxHeight: 280,
                            overflowY: "auto",
                          }}
                        >
                          {diagnosticos.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => seleccionarDiagnostico(d)}
                              style={{
                                width: "100%",
                                display: "block",
                                textAlign: "left",
                                padding: "11px 12px",
                                border: "none",
                                borderBottom: "1px solid var(--border)",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                {d.codigo}
                              </div>

                              <div
                                style={{
                                  marginTop: 3,
                                  fontSize: 12,
                                  color: "var(--muted)",
                                }}
                              >
                                {d.descripcion}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                    {!buscandoDiagnosticos &&
                      diagnosticoAbierto &&
                      busquedaDiagnostico.trim().length >= 2 &&
                      diagnosticos.length === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 30,
                            left: 0,
                            right: 0,
                            top: "100%",
                            marginTop: 4,
                            background: "#fff",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "var(--muted)",
                          }}
                        >
                          No se encontraron diagnósticos.
                        </div>
                      )}
                  </>
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
