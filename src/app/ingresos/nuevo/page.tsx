// src/app/ingresos/nuevo/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Servicio = { id: number; nombre: string };

type Especialidad = {
  id: number;
  nombre: string;
  servicioId: number;
};

type Cama = {
  id: number;
  numero: string;
  estado: string;
  ubicacion: string | null;
};

type Paciente = {
  hc: string;
  dni: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
};

type Diagnostico = {
  cie10Codigo: string;
  cie10Descripcion: string;
};

const FINANCIAMIENTOS = [
  "SIS Gratuito",
  "SIS Para Todos",
  "Particular",
  "Fondo Salud",
  "Otro",
];

export default function NuevoIngresoPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);

  const [servicioId, setServicioId] = useState("");
  const [especialidadId, setEspecialidadId] = useState("");
  const [camaId, setCamaId] = useState("");

  const [hc, setHc] = useState("");
  const [pacienteEncontrado, setPacienteEncontrado] =
    useState<Paciente | null>(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);

  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [sexo, setSexo] = useState<"M" | "F" | "">("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const [medico, setMedico] = useState("");
  const [tipoIngreso, setTipoIngreso] = useState<
    "normal" | "transferencia"
  >("normal");
  const [servicioOrigenId, setServicioOrigenId] = useState("");
  const [financiamiento, setFinanciamiento] = useState("");
  const [usaVentilador, setUsaVentilador] = useState(false);
  const [usaOxigeno, setUsaOxigeno] = useState(false);
  const [tieneProblemaJudicial, setTieneProblemaJudicial] =
    useState(false);
  const [tieneProblemaSocial, setTieneProblemaSocial] =
    useState(false);
  const [notasEstancia, setNotasEstancia] = useState("");

  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([
    { cie10Codigo: "", cie10Descripcion: "" },
  ]);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then(setServicios)
      .catch(() =>
        setMensaje("❌ No se pudieron cargar los servicios")
      );
  }, []);

  useEffect(() => {
    if (!servicioId) {
      setEspecialidades([]);
      return;
    }

    setEspecialidadId("");
    setCamas([]);
    setCamaId("");

    fetch(`/api/especialidades?servicioId=${servicioId}`)
      .then((r) => r.json())
      .then(setEspecialidades);
  }, [servicioId]);

  useEffect(() => {
    if (!especialidadId) {
      setCamas([]);
      return;
    }

    setCamaId("");

    fetch(`/api/camas?especialidadId=${especialidadId}`)
      .then((r) => r.json())
      .then(setCamas);
  }, [especialidadId]);

  async function buscarPaciente() {
    if (!hc) return;

    setBuscandoPaciente(true);
    setPacienteEncontrado(null);
    setMensaje(null);

    try {
      const res = await fetch(`/api/pacientes/${hc}`);

      if (res.ok) {
        const data = await res.json();

        setPacienteEncontrado(data);
        setDni(data.dni ?? "");
        setNombres(data.nombres);
        setApellidoPaterno(data.apellidoPaterno);
        setApellidoMaterno(data.apellidoMaterno ?? "");
        setSexo(data.sexo ?? "");
        setFechaNacimiento(
          data.fechaNacimiento
            ? String(data.fechaNacimiento).slice(0, 10)
            : ""
        );
      } else {
        setPacienteEncontrado(null);
        setDni("");
        setNombres("");
        setApellidoPaterno("");
        setApellidoMaterno("");
        setSexo("");
        setFechaNacimiento("");
      }
    } finally {
      setBuscandoPaciente(false);
    }
  }

  function actualizarDiagnostico(
    i: number,
    campo: keyof Diagnostico,
    valor: string
  ) {
    setDiagnosticos((prev) =>
      prev.map((d, idx) =>
        idx === i ? { ...d, [campo]: valor } : d
      )
    );
  }

  function agregarDiagnostico() {
    setDiagnosticos((prev) => [
      ...prev,
      { cie10Codigo: "", cie10Descripcion: "" },
    ]);
  }

  function quitarDiagnostico(i: number) {
    setDiagnosticos((prev) =>
      prev.filter((_, idx) => idx !== i)
    );
  }

  async function registrarIngreso() {
    setEnviando(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hc,
          dni: pacienteEncontrado ? undefined : dni,
          nombres: pacienteEncontrado ? undefined : nombres,
          apellidoPaterno: pacienteEncontrado
            ? undefined
            : apellidoPaterno,
          apellidoMaterno: pacienteEncontrado
            ? undefined
            : apellidoMaterno,
          sexo: pacienteEncontrado ? undefined : sexo,
          fechaNacimiento: pacienteEncontrado
            ? undefined
            : fechaNacimiento || undefined,
          camaId: Number(camaId),
          medico,
          tipoIngreso,
          servicioOrigenId: servicioOrigenId
            ? Number(servicioOrigenId)
            : undefined,
          financiamiento,
          usaVentilador,
          usaOxigeno,
          tieneProblemaJudicial,
          tieneProblemaSocial,
          notasEstancia,
          diagnosticos: diagnosticos.filter(
            (d) => d.cie10Descripcion.trim() !== ""
          ),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(
          `✅ Ingreso registrado correctamente (id ${data.id})`
        );

        setHc("");
        setPacienteEncontrado(null);
        setDni("");
        setNombres("");
        setApellidoPaterno("");
        setApellidoMaterno("");
        setSexo("");
        setFechaNacimiento("");
        setMedico("");
        setTipoIngreso("normal");
        setServicioOrigenId("");
        setFinanciamiento("");
        setUsaVentilador(false);
        setUsaOxigeno(false);
        setTieneProblemaJudicial(false);
        setTieneProblemaSocial(false);
        setNotasEstancia("");
        setDiagnosticos([
          { cie10Codigo: "", cie10Descripcion: "" },
        ]);
        setCamaId("");

        if (especialidadId) {
          fetch(`/api/camas?especialidadId=${especialidadId}`)
            .then((r) => r.json())
            .then(setCamas);
        }
      } else {
        setMensaje(`❌ ${data.error}`);
      }
    } catch (err) {
      setMensaje(`❌ Error de red: ${String(err)}`);
    } finally {
      setEnviando(false);
    }
  }

  const diagnosticoValido = diagnosticos.some(
    (d) => d.cie10Descripcion.trim() !== ""
  );

  const transferenciaValida =
    tipoIngreso === "normal" || !!servicioOrigenId;

  const datosNuevoPacienteValidos =
    pacienteEncontrado || (nombres && apellidoPaterno && sexo);

  const listo =
    servicioId &&
    especialidadId &&
    camaId &&
    hc &&
    diagnosticoValido &&
    transferenciaValida &&
    datosNuevoPacienteValidos;

  return (
    <div className="form-page">
      <header className="page-heading page-heading-with-action">
        <div>
          <p className="page-kicker">Admisión hospitalaria</p>
          <h1>Registrar ingreso</h1>
          <p>
            Registra una nueva hospitalización y asigna la cama correspondiente.
          </p>
        </div>

        <Link href="/panel" className="page-heading-action">
          ← Volver al panel
        </Link>
      </header>

      <div className="form-card">
        {/* 01 UBICACIÓN */}
        <section className="form-section">
          <div className="form-section-title">
            01 · Ubicación hospitalaria
          </div>

          <p className="form-section-description">
            Selecciona dónde será hospitalizado el paciente.
          </p>

          <div className="form-field">
            <label className="form-label">Servicio</label>

            <select
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              className="form-select"
            >
              <option value="">Selecciona un servicio</option>

              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {servicioId && (
            <div className="form-field">
              <label className="form-label">Especialidad</label>

              <select
                value={especialidadId}
                onChange={(e) =>
                  setEspecialidadId(e.target.value)
                }
                className="form-select"
              >
                <option value="">
                  Selecciona una especialidad
                </option>

                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {especialidadId && (
            <div className="form-field">
              <label className="form-label">Cama libre</label>

              <select
                value={camaId}
                onChange={(e) => setCamaId(e.target.value)}
                className="form-select"
              >
                <option value="">
                  {camas.length === 0
                    ? "No hay camas libres"
                    : "Selecciona una cama"}
                </option>

                {camas.map((c) => (
                  <option key={c.id} value={c.id}>
                    Cama {c.numero}
                    {c.ubicacion ? ` — ${c.ubicacion}` : ""}
                  </option>
                ))}
              </select>

              {camas.length > 0 && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "var(--success)",
                  }}
                >
                  ● {camas.length} cama
                  {camas.length !== 1 ? "s" : ""} disponible
                  {camas.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </section>

        {/* 02 TIPO DE INGRESO */}
        <section className="form-section">
          <div className="form-section-title">
            02 · Tipo de ingreso
          </div>

          <p className="form-section-description">
            Define cómo se produce el ingreso del paciente.
          </p>

          <div className="form-field">
            <label className="form-label">Tipo de ingreso</label>

            <select
              value={tipoIngreso}
              onChange={(e) =>
                setTipoIngreso(
                  e.target.value as "normal" | "transferencia"
                )
              }
              className="form-select"
            >
              <option value="normal">Ingreso normal</option>
              <option value="transferencia">
                Admitido por transferencia
              </option>
            </select>
          </div>

          {tipoIngreso === "transferencia" && (
            <div className="form-field">
              <label className="form-label">
                Servicio de origen
              </label>

              <select
                value={servicioOrigenId}
                onChange={(e) =>
                  setServicioOrigenId(e.target.value)
                }
                className="form-select"
              >
                <option value="">
                  Selecciona el servicio de origen
                </option>

                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* 03 IDENTIFICACIÓN */}
        <section className="form-section">
          <div className="form-section-title">
            03 · Identificación del paciente
          </div>

          <p className="form-section-description">
            Busca primero la historia clínica. Si no existe,
            completa los datos manualmente.
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
                onBlur={buscarPaciente}
                onKeyDown={(e) =>
                  e.key === "Enter" && buscarPaciente()
                }
                placeholder="Ej. 00001234"
                className="form-input"
              />

              <button
                onClick={buscarPaciente}
                disabled={!hc || buscandoPaciente}
                className="btn btn-primary"
              >
                {buscandoPaciente ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {pacienteEncontrado && (
            <div
              style={{
                marginTop: 16,
                padding: 15,
                borderRadius: 10,
                border: "1px solid #b8e2d0",
                background: "var(--success-light)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--success)",
                }}
              >
                ✓ Paciente encontrado
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {pacienteEncontrado.nombres}{" "}
                {pacienteEncontrado.apellidoPaterno}{" "}
                {pacienteEncontrado.apellidoMaterno}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                HC: {pacienteEncontrado.hc}
                {pacienteEncontrado.sexo
                  ? ` · ${
                      pacienteEncontrado.sexo === "M"
                        ? "Hombre"
                        : "Mujer"
                    }`
                  : ""}
              </div>
            </div>
          )}

          {!pacienteEncontrado && hc && !buscandoPaciente && (
            <div style={{ marginTop: 18 }}>
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--warning-light)",
                  border: "1px solid #f3d69a",
                  color: "#8a5b13",
                  fontSize: 13,
                }}
              >
                ⚠️ Paciente no encontrado. Completa los datos
                para registrarlo.
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">DNI</label>

                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Nombres</label>

                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Apellido paterno
                  </label>

                  <input
                    type="text"
                    value={apellidoPaterno}
                    onChange={(e) =>
                      setApellidoPaterno(e.target.value)
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Apellido materno
                  </label>

                  <input
                    type="text"
                    value={apellidoMaterno}
                    onChange={(e) =>
                      setApellidoMaterno(e.target.value)
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Sexo</label>

                  <select
                    value={sexo}
                    onChange={(e) =>
                      setSexo(e.target.value as "M" | "F" | "")
                    }
                    className="form-select"
                  >
                    <option value="">Selecciona...</option>
                    <option value="M">Hombre</option>
                    <option value="F">Mujer</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Fecha de nacimiento
                  </label>

                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) =>
                      setFechaNacimiento(e.target.value)
                    }
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 04 INFORMACIÓN CLÍNICA */}
        <section className="form-section">
          <div className="form-section-title">
            04 · Información clínica
          </div>

          <p className="form-section-description">
            Registra los datos médicos y de financiamiento del
            ingreso.
          </p>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">
                Médico tratante
              </label>

              <input
                type="text"
                value={medico}
                onChange={(e) => setMedico(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                Financiamiento
              </label>

              <select
                value={financiamiento}
                onChange={(e) =>
                  setFinanciamiento(e.target.value)
                }
                className="form-select"
              >
                <option value="">Selecciona...</option>

                {FINANCIAMIENTOS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="form-label">
              Soporte y condiciones especiales
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fafbfd",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={usaVentilador}
                  onChange={(e) =>
                    setUsaVentilador(e.target.checked)
                  }
                />
                Usa ventilador mecánico
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fafbfd",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={usaOxigeno}
                  onChange={(e) =>
                    setUsaOxigeno(e.target.checked)
                  }
                />
                Usa oxígeno
              </label>
            </div>
          </div>
        </section>

        {/* 05 DIAGNÓSTICOS */}
        <section className="form-section">
          <div className="form-section-title">
            05 · Diagnósticos
          </div>

          <p className="form-section-description">
            Registra al menos un diagnóstico mediante descripción.
            El código CIE-10 es opcional.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {diagnosticos.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "140px minmax(0, 1fr) auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="CIE-10"
                  value={d.cie10Codigo}
                  onChange={(e) =>
                    actualizarDiagnostico(
                      i,
                      "cie10Codigo",
                      e.target.value
                    )
                  }
                  className="form-input"
                />

                <input
                  type="text"
                  placeholder="Descripción del diagnóstico"
                  value={d.cie10Descripcion}
                  onChange={(e) =>
                    actualizarDiagnostico(
                      i,
                      "cie10Descripcion",
                      e.target.value
                    )
                  }
                  className="form-input"
                />

                {diagnosticos.length > 1 && (
                  <button
                    onClick={() => quitarDiagnostico(i)}
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      minWidth: 40,
                      padding: "8px 10px",
                    }}
                    aria-label="Eliminar diagnóstico"
                    title="Eliminar diagnóstico"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={agregarDiagnostico}
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 12 }}
          >
            + Agregar diagnóstico
          </button>
        </section>

        {/* 06 ESTANCIA */}
        <section className="form-section">
          <div className="form-section-title">
            06 · Estancia prolongada
          </div>

          <p className="form-section-description">
            Información opcional asociada a situaciones que puedan
            prolongar la estancia hospitalaria.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fafbfd",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={tieneProblemaJudicial}
                onChange={(e) =>
                  setTieneProblemaJudicial(e.target.checked)
                }
              />
              Problema judicial
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fafbfd",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={tieneProblemaSocial}
                onChange={(e) =>
                  setTieneProblemaSocial(e.target.checked)
                }
              />
              Problema social
            </label>
          </div>

          <div className="form-field">
            <label className="form-label">
              Notas adicionales
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

            <textarea
              placeholder="Ingresa cualquier observación relevante..."
              value={notasEstancia}
              onChange={(e) =>
                setNotasEstancia(e.target.value)
              }
              className="form-textarea"
            />
          </div>
        </section>

        {/* CONFIRMACIÓN */}
        <section className="form-section">
          <div className="form-section-title">
            Confirmación del ingreso
          </div>

          <p className="form-section-description">
            Verifica que la información requerida esté completa
            antes de registrar el ingreso.
          </p>

          <div
            style={{
              padding: 15,
              borderRadius: 10,
              background: listo
                ? "var(--success-light)"
                : "#f5f7fa",
              border: listo
                ? "1px solid #b8e2d0"
                : "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: listo
                  ? "var(--success)"
                  : "var(--muted)",
              }}
            >
              {listo
                ? "✓ Formulario listo para registrar"
                : "Formulario pendiente de completar"}
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              Se requiere servicio, especialidad, cama,
              identificación del paciente y diagnóstico.
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
              onClick={registrarIngreso}
              disabled={!listo || enviando}
              className="btn btn-primary"
              style={{
                minWidth: 210,
                minHeight: 44,
              }}
            >
              {enviando
                ? "Guardando..."
                : "✓ Registrar ingreso"}
            </button>
          </div>
        </section>

        {mensaje && (
          <div
            className="status-message"
            style={{
              background: mensaje.startsWith("✅")
                ? "var(--success-light)"
                : "var(--danger-light)",
              borderColor: mensaje.startsWith("✅")
                ? "#b8e2d0"
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