// src/app/egresos/nuevo/page.tsx

"use client";

import { useEffect, useState } from "react";

type IngresoActivo = {
  ingresoId: number;
  hc: string;
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

const TIPOS_EGRESO = [
  { value: "alta_medica", label: "Alta médica" },
  { value: "alta_voluntaria", label: "Alta voluntaria" },
  { value: "fallecido", label: "Fallecido" },
  { value: "transferencia", label: "Transferencia" },
  { value: "retiro", label: "Retiro" },
  { value: "otro", label: "Otro" },
];

export default function NuevoEgresoPage() {
  const [hc, setHc] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<IngresoActivo[]>([]);
  const [seleccionado, setSeleccionado] = useState<IngresoActivo | null>(null);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tipoEgreso, setTipoEgreso] = useState("");
  const [codigoEgresoOriginal, setCodigoEgresoOriginal] = useState("");
  const [servicioDestinoId, setServicioDestinoId] = useState("");
  const [medicoAlta, setMedicoAlta] = useState("");
  const [diagnosticoFinal, setDiagnosticoFinal] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servicios").then((r) => r.json()).then(setServicios);
  }, []);

  async function buscar() {
    if (!hc) return;

    setBuscando(true);
    setResultados([]);
    setSeleccionado(null);
    setMensaje(null);

    try {
      const res = await fetch(`/api/ingresos/activos?hc=${hc}`);
      const data = await res.json();

      setResultados(data);

      if (data.length === 0) {
        setMensaje("⚠️ No se encontró ningún ingreso activo con ese HC");
      }
    } finally {
      setBuscando(false);
    }
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
          codigoEgresoOriginal: codigoEgresoOriginal || undefined,
          servicioDestinoId: servicioDestinoId
            ? Number(servicioDestinoId)
            : undefined,
          medicoAlta,
          diagnosticoFinal,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(
          `✅ Egreso registrado correctamente (id ${data.id}). La cama quedó libre.`
        );

        setHc("");
        setResultados([]);
        setSeleccionado(null);
        setTipoEgreso("");
        setCodigoEgresoOriginal("");
        setServicioDestinoId("");
        setMedicoAlta("");
        setDiagnosticoFinal("");
      } else {
        setMensaje(`❌ ${data.error}`);
      }
    } catch (err) {
      setMensaje(`❌ Error de red: ${String(err)}`);
    } finally {
      setEnviando(false);
    }
  }

  const transferenciaValida =
    tipoEgreso !== "transferencia" || !!servicioDestinoId;

  const listo = seleccionado && tipoEgreso && transferenciaValida;

  return (
    <div className="form-page">
      <div className="page-heading">
        <h1>Registrar egreso de paciente</h1>
        <p>
          Registra la salida del paciente y actualiza automáticamente la
          disponibilidad de su cama.
        </p>
      </div>

      <div className="form-card">
        {/* PASO 1 */}
        <section className="form-section">
          <div className="form-section-title">
            01 · Buscar paciente
          </div>

          <p className="form-section-description">
            Ingresa la historia clínica del paciente que actualmente se
            encuentra hospitalizado.
          </p>

          <div className="form-field">
            <label className="form-label">
              Historia clínica (HC)
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
              }}
            >
              <input
                type="text"
                value={hc}
                onChange={(e) => setHc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
                placeholder="Ej. 00001234"
                className="form-input"
              />

              <button
                onClick={buscar}
                disabled={!hc || buscando}
                className="btn btn-primary"
              >
                {buscando ? "Buscando..." : "Buscar paciente"}
              </button>
            </div>
          </div>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            Presiona Enter o utiliza el botón para realizar la búsqueda.
          </p>
        </section>

        {/* RESULTADOS */}
        {resultados.length > 0 && (
          <section className="form-section">
            <div className="form-section-title">
              02 · Paciente encontrado
            </div>

            <p className="form-section-description">
              Selecciona la estancia hospitalaria correspondiente.
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              {resultados.map((r) => {
                const estaSeleccionado =
                  seleccionado?.ingresoId === r.ingresoId;

                return (
                  <button
                    key={r.ingresoId}
                    type="button"
                    onClick={() => setSeleccionado(r)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      border: estaSeleccionado
                        ? "2px solid var(--success)"
                        : "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 16,
                      background: estaSeleccionado
                        ? "var(--success-light)"
                        : "white",
                      boxShadow: estaSeleccionado
                        ? "0 0 0 3px rgba(22,128,91,0.08)"
                        : "var(--shadow-sm)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--foreground)",
                          }}
                        >
                          {r.nombres} {r.apellidoPaterno}{" "}
                          {r.apellidoMaterno}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: "var(--muted)",
                          }}
                        >
                          HC: <strong>{r.hc}</strong>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: estaSeleccionado
                            ? "#d5f1e3"
                            : "#eef2f6",
                          color: estaSeleccionado
                            ? "var(--success)"
                            : "#536171",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {estaSeleccionado ? "SELECCIONADO" : "ACTIVO"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          padding: "6px 9px",
                          borderRadius: 7,
                          background: "#f4f6f8",
                          fontSize: 12,
                          color: "#465467",
                        }}
                      >
                        {r.servicioNombre}
                      </span>

                      <span
                        style={{
                          padding: "6px 9px",
                          borderRadius: 7,
                          background: "#f4f6f8",
                          fontSize: 12,
                          color: "#465467",
                        }}
                      >
                        {r.especialidadNombre}
                      </span>

                      <span
                        style={{
                          padding: "6px 9px",
                          borderRadius: 7,
                          background: "#e8f3f7",
                          color: "var(--primary-dark)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Cama {r.numeroCama}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      Ingresó:{" "}
                      {new Date(r.fechaIngreso).toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* FORMULARIO DE EGRESO */}
        {seleccionado && (
          <>
            <section className="form-section">
              <div className="form-section-title">
                03 · Datos del egreso
              </div>

              <p className="form-section-description">
                Registra el motivo y los datos correspondientes a la
                salida del paciente.
              </p>

              <div className="form-field">
                <label className="form-label">
                  Tipo de egreso
                </label>

                <select
                  value={tipoEgreso}
                  onChange={(e) => setTipoEgreso(e.target.value)}
                  className="form-select"
                >
                  <option value="">Selecciona...</option>

                  {TIPOS_EGRESO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {tipoEgreso === "transferencia" && (
                <div className="form-field">
                  <label className="form-label">
                    Servicio de destino
                  </label>

                  <select
                    value={servicioDestinoId}
                    onChange={(e) =>
                      setServicioDestinoId(e.target.value)
                    }
                    className="form-select"
                  >
                    <option value="">
                      Selecciona el servicio de destino
                    </option>

                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field">
                <label className="form-label">
                  Código de egreso original
                  <span
                    style={{
                      marginLeft: 6,
                      color: "var(--muted)",
                      fontWeight: 400,
                    }}
                  >
                    (opcional)
                  </span>
                </label>

                <input
                  type="text"
                  value={codigoEgresoOriginal}
                  onChange={(e) =>
                    setCodigoEgresoOriginal(e.target.value)
                  }
                  placeholder="Ej. AH, AL, FA, AV, RE"
                  className="form-input"
                />

                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  Puedes registrar aquí el código utilizado por el
                  hospital mientras se confirma su significado exacto.
                </p>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    Médico que da el alta
                  </label>

                  <input
                    type="text"
                    value={medicoAlta}
                    onChange={(e) => setMedicoAlta(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Diagnóstico final
                  </label>

                  <input
                    type="text"
                    value={diagnosticoFinal}
                    onChange={(e) =>
                      setDiagnosticoFinal(e.target.value)
                    }
                    className="form-input"
                  />
                </div>
              </div>
            </section>

            {/* CONFIRMACIÓN */}
            <section className="form-section">
              <div className="form-section-title">
                04 · Confirmación
              </div>

              <div
                style={{
                  border: "1px solid #cce4ec",
                  background: "var(--primary-light)",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--primary-dark)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Paciente seleccionado
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {seleccionado.nombres}{" "}
                  {seleccionado.apellidoPaterno}{" "}
                  {seleccionado.apellidoMaterno}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  HC {seleccionado.hc} · Cama{" "}
                  {seleccionado.numeroCama} ·{" "}
                  {seleccionado.servicioNombre}
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={registrarEgreso}
                  disabled={!listo || enviando}
                  className="btn btn-primary"
                  style={{
                    minWidth: 190,
                    minHeight: 44,
                  }}
                >
                  {enviando
                    ? "Guardando..."
                    : "✓ Registrar egreso"}
                </button>
              </div>
            </section>
          </>
        )}

        {/* MENSAJE */}
        {mensaje && (
          <div
            className="status-message"
            style={{
              background: mensaje.startsWith("✅")
                ? "var(--success-light)"
                : mensaje.startsWith("⚠️")
                ? "var(--warning-light)"
                : "var(--danger-light)",
              borderColor: mensaje.startsWith("✅")
                ? "#b8e2d0"
                : mensaje.startsWith("⚠️")
                ? "#f3d69a"
                : "#efc2c2",
            }}
          >
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
}