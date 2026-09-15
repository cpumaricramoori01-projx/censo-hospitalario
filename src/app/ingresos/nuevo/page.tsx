// src/app/ingresos/nuevo/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

type DiagnosticoResultado = {
  id: number;
  codigo: string;
  descripcion: string;
};

type Medico = {
  id: number;
  cmp: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  especialidad: string;
  servicioId: number;
  servicio: string;
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

  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [resultadosPaciente, setResultadosPaciente] = useState<Paciente[]>([]);
  const [pacienteAbierto, setPacienteAbierto] = useState(false);
  const [pacienteNoEncontrado, setPacienteNoEncontrado] = useState(false);

  const pacienteRef = useRef<HTMLDivElement | null>(null);

  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [sexo, setSexo] = useState<"M" | "F" | "">("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  // Médico tratante
  const [medico, setMedico] = useState("");
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [busquedaMedico, setBusquedaMedico] = useState("");
  const [resultadosMedico, setResultadosMedico] = useState<Medico[]>([]);
  const [buscandoMedico, setBuscandoMedico] = useState(false);
  const [medicoAbierto, setMedicoAbierto] = useState(false);

  const medicoRef = useRef<HTMLDivElement | null>(null);

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

  // Estados del buscador CIE-10
  const [busquedaDiagnostico, setBusquedaDiagnostico] = useState<
    Record<number, string>
  >({});

  const [resultadosDiagnostico, setResultadosDiagnostico] = useState<
    Record<number, DiagnosticoResultado[]>
  >({});

  const [buscandoDiagnostico, setBuscandoDiagnostico] = useState<
    Record<number, boolean>
  >({});

  // Diagnóstico que actualmente tiene abierto el desplegable
  const [diagnosticoAbierto, setDiagnosticoAbierto] = useState<number | null>(
    null
  );

  // Referencias de cada buscador para detectar clic fuera
  const diagnosticoRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then(setServicios)
      .catch(() =>
        setMensaje("❌ No se pudieron cargar los servicios"),
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

  // Cierra el buscador CIE-10 al hacer clic fuera
  useEffect(() => {
    function manejarClickFuera(event: MouseEvent) {
      const objetivo = event.target as Node;

      if (diagnosticoAbierto === null) {
        return;
      }

      const ref = diagnosticoRefs.current[diagnosticoAbierto];

      if (ref && !ref.contains(objetivo)) {
        setDiagnosticoAbierto(null);
      }
    }

    document.addEventListener("mousedown", manejarClickFuera);

    return () => {
      document.removeEventListener("mousedown", manejarClickFuera);
    };
  }, [diagnosticoAbierto]);

// Cierra el buscador de pacientes al hacer clic fuera
useEffect(() => {
  function manejarClickFuera(event: MouseEvent) {
    const objetivo = event.target as Node;

    if (
      pacienteRef.current &&
      !pacienteRef.current.contains(objetivo)
    ) {
      setPacienteAbierto(false);
    }
  }

  document.addEventListener("mousedown", manejarClickFuera);

  return () => {
    document.removeEventListener("mousedown", manejarClickFuera);
  };
}, []);

async function buscarPacientes(termino: string) {
  setBusquedaPaciente(termino);

  if (termino.trim().length < 2) {
    setResultadosPaciente([]);
    setPacienteAbierto(false);
    setPacienteNoEncontrado(false);
    return;
  }

  setPacienteAbierto(true);
  setBuscandoPaciente(true);

  try {
    const res = await fetch(
      `/api/pacientes/buscar?q=${encodeURIComponent(
        termino.trim(),
      )}`,
    );

    if (!res.ok) {
      throw new Error("Error consultando pacientes");
    }

    const data = await res.json();

    setResultadosPaciente(data);
    setPacienteNoEncontrado(data.length === 0);
    setPacienteAbierto(true);
  } catch (error) {
    console.error("Error buscando paciente:", error);

    setResultadosPaciente([]);
    setPacienteAbierto(false);
  } finally {
    setBuscandoPaciente(false);
  }
}

function seleccionarPaciente(paciente: Paciente) {
  setPacienteEncontrado(paciente);

  setHc(paciente.hc);
  setDni(paciente.dni ?? "");
  setNombres(paciente.nombres);
  setApellidoPaterno(paciente.apellidoPaterno);
  setApellidoMaterno(paciente.apellidoMaterno ?? "");
  setSexo((paciente.sexo as "M" | "F" | "") ?? "");
  setFechaNacimiento(
    paciente.fechaNacimiento
      ? String(paciente.fechaNacimiento).slice(0, 10)
      : "",
  );

  setBusquedaPaciente("");
  setResultadosPaciente([]);
  setPacienteAbierto(false);
  setMensaje(null);
}


  async function buscarMedicos(termino: string) {
    setBusquedaMedico(termino);

    if (termino.trim().length < 2) {
      setResultadosMedico([]);
      setMedicoAbierto(false);
      return;
    }

    setMedicoAbierto(true);
    setBuscandoMedico(true);

    try {
      const res = await fetch(
        `/api/medicos?q=${encodeURIComponent(termino.trim())}`,
      );

      if (!res.ok) {
        throw new Error("Error consultando médicos");
      }

      const data = await res.json();

      setResultadosMedico(data);
      setMedicoAbierto(true);
    } catch (error) {
      console.error("Error buscando médico:", error);

      setResultadosMedico([]);
      setMedicoAbierto(false);
    } finally {
      setBuscandoMedico(false);
    }
  }

  function seleccionarMedico(m: Medico) {
    const nombreCompleto = [
      m.nombres,
      m.apellidoPaterno,
      m.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(" ");

    setMedico(nombreCompleto);
    setMedicoId(m.id);
    setBusquedaMedico("");
    setResultadosMedico([]);
    setMedicoAbierto(false);
  }

  async function buscarDiagnosticos(i: number, termino: string) {
    setBusquedaDiagnostico((prev) => ({
      ...prev,
      [i]: termino,
    }));

    if (termino.trim().length < 2) {
      setResultadosDiagnostico((prev) => ({
        ...prev,
        [i]: [],
      }));

      setDiagnosticoAbierto(null);

      return;
    }

    setDiagnosticoAbierto(i);

    setBuscandoDiagnostico((prev) => ({
      ...prev,
      [i]: true,
    }));

    try {
      const res = await fetch(
        `/api/diagnosticos?q=${encodeURIComponent(termino.trim())}`,
      );

      if (!res.ok) {
        throw new Error("Error consultando diagnósticos");
      }

      const data = await res.json();

      setResultadosDiagnostico((prev) => ({
        ...prev,
        [i]: data,
      }));

      setDiagnosticoAbierto(i);
    } catch (error) {
      console.error("Error buscando diagnóstico:", error);

      setResultadosDiagnostico((prev) => ({
        ...prev,
        [i]: [],
      }));

      setDiagnosticoAbierto(null);
    } finally {
      setBuscandoDiagnostico((prev) => ({
        ...prev,
        [i]: false,
      }));
    }
  }

  function seleccionarDiagnostico(
    i: number,
    diagnostico: DiagnosticoResultado,
  ) {
    setDiagnosticos((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? {
              cie10Codigo: diagnostico.codigo,
              cie10Descripcion: diagnostico.descripcion,
            }
          : d,
      ),
    );

    setBusquedaDiagnostico((prev) => ({
      ...prev,
      [i]: "",
    }));

    setResultadosDiagnostico((prev) => ({
      ...prev,
      [i]: [],
    }));

    setDiagnosticoAbierto(null);
  }

  function actualizarDiagnostico(
    i: number,
    campo: keyof Diagnostico,
    valor: string,
  ) {
    setDiagnosticos((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? { ...d, [campo]: valor }
          : d,
      ),
    );
  }

  function agregarDiagnostico() {
    setDiagnosticos((prev) => [
      ...prev,
      {
        cie10Codigo: "",
        cie10Descripcion: "",
      },
    ]);
  }

  function quitarDiagnostico(i: number) {
    setDiagnosticos((prev) =>
      prev.filter((_, idx) => idx !== i),
    );

    setBusquedaDiagnostico((prev) => {
      const nuevo = { ...prev };
      delete nuevo[i];
      return nuevo;
    });

    setResultadosDiagnostico((prev) => {
      const nuevo = { ...prev };
      delete nuevo[i];
      return nuevo;
    });

    setBuscandoDiagnostico((prev) => {
      const nuevo = { ...prev };
      delete nuevo[i];
      return nuevo;
    });

    if (diagnosticoAbierto === i) {
      setDiagnosticoAbierto(null);
    }
  }

  async function registrarIngreso() {
    setEnviando(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hc,
          dni: pacienteEncontrado ? undefined : dni,
          nombres: pacienteEncontrado
            ? undefined
            : nombres,
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

          // Se mantiene el nombre para compatibilidad.
          medico,

          // Nueva relación con el maestro de médicos.
          medicoId,

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
            (d) => d.cie10Descripcion.trim() !== "",
          ),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(
          `✅ Ingreso registrado correctamente (id ${data.id})`,
        );

        setHc("");
        setDni("");
        setNombres("");
        setApellidoPaterno("");
        setApellidoMaterno("");
        setSexo("");
        setFechaNacimiento("");

        setPacienteEncontrado(null);
        setPacienteNoEncontrado(false);
        setBusquedaPaciente("");
        setResultadosPaciente([]);
        setBuscandoPaciente(false);
        setPacienteAbierto(false);

        setMedico("");
        setMedicoId(null);
        setBusquedaMedico("");
        setResultadosMedico([]);
        setBuscandoMedico(false);
        setMedicoAbierto(false);

        setTipoIngreso("normal");
        setServicioOrigenId("");
        setFinanciamiento("");
        setUsaVentilador(false);
        setUsaOxigeno(false);
        setTieneProblemaJudicial(false);
        setTieneProblemaSocial(false);
        setNotasEstancia("");

        setDiagnosticos([
          {
            cie10Codigo: "",
            cie10Descripcion: "",
          },
        ]);

        setBusquedaDiagnostico({});
        setResultadosDiagnostico({});
        setBuscandoDiagnostico({});
        setDiagnosticoAbierto(null);

        setCamaId("");

        if (especialidadId) {
          fetch(
            `/api/camas?especialidadId=${especialidadId}`,
          )
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
    (d) =>
      d.cie10Codigo.trim() !== "" &&
      d.cie10Descripcion.trim() !== "",
  );

  const transferenciaValida =
    tipoIngreso === "normal" || !!servicioOrigenId;

  const pacienteValido =
    pacienteEncontrado ||
    (pacienteNoEncontrado &&
      nombres.trim() &&
      apellidoPaterno.trim() &&
      sexo);

  const listo =
    servicioId &&
    especialidadId &&
    camaId &&
    pacienteValido &&
    diagnosticoValido &&
    transferenciaValida;

  return (
    <div className="form-page ingreso-form-page">
      <header className="page-heading page-heading-with-action">
        <div>
          <p className="page-kicker">
            Admisión hospitalaria
          </p>

          <h1>Registrar ingreso</h1>

          <p>
            Registra una nueva hospitalización y asigna
            la cama correspondiente.
          </p>
        </div>

        <Link
          href="/panel"
          className="page-heading-action"
        >
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
            Selecciona dónde será hospitalizado el
            paciente.
          </p>

          <div className="form-field">
            <label className="form-label">
              Servicio
            </label>

            <select
              value={servicioId}
              onChange={(e) =>
                setServicioId(e.target.value)
              }
              className="form-select"
            >
              <option value="">
                Selecciona un servicio
              </option>

              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {servicioId && (
            <div className="form-field">
              <label className="form-label">
                Especialidad
              </label>

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
              <label className="form-label">
                Cama libre
              </label>

              <select
                value={camaId}
                onChange={(e) =>
                  setCamaId(e.target.value)
                }
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
                    {c.ubicacion
                      ? ` — ${c.ubicacion}`
                      : ""}
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
                  {camas.length !== 1 ? "s" : ""}{" "}
                  disponible
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
            Define cómo se produce el ingreso del
            paciente.
          </p>

          <div className="form-field">
            <label className="form-label">
              Tipo de ingreso
            </label>

            <select
              value={tipoIngreso}
              onChange={(e) =>
                setTipoIngreso(
                  e.target.value as
                    | "normal"
                    | "transferencia",
                )
              }
              className="form-select"
            >
              <option value="normal">
                Ingreso normal
              </option>

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
                  setServicioOrigenId(
                    e.target.value,
                  )
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
        Busca por historia clínica, DNI, nombres o
apellidos. Si no existe, completa los datos
manualmente.
          </p>

     <div
  className="form-field"
  ref={pacienteRef}
  style={{ position: "relative" }}
>
  <label className="form-label">
    Buscar paciente
  </label>

  <input
    type="text"
    value={busquedaPaciente}
    onChange={(e) => {
      buscarPacientes(e.target.value);

      // Si empieza una nueva búsqueda,
      // quitamos la selección anterior.
      if (pacienteEncontrado) {
        setPacienteEncontrado(null);
        setHc("");
        setDni("");
        setNombres("");
        setApellidoPaterno("");
        setApellidoMaterno("");
        setSexo("");
        setFechaNacimiento("");
      }
    }}
    onFocus={() => {
      if (busquedaPaciente.trim().length >= 2) {
        setPacienteAbierto(true);
      }
    }}
    placeholder="HC, DNI, nombres o apellidos..."
    className="form-input"
    autoComplete="off"
  />

  {buscandoPaciente && pacienteAbierto && (
    <div
      style={{
        marginTop: 6,
        fontSize: 12,
        color: "var(--muted)",
      }}
    >
      Buscando pacientes...
    </div>
  )}

  {!buscandoPaciente &&
    pacienteAbierto &&
    resultadosPaciente.length > 0 && (
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
          boxShadow:
            "0 8px 24px rgba(0,0,0,0.12)",
          maxHeight: 280,
          overflowY: "auto",
        }}
      >
        {resultadosPaciente.map((p) => (
          <button
            key={p.hc}
            type="button"
            onClick={() => seleccionarPaciente(p)}
            style={{
              width: "100%",
              display: "block",
              textAlign: "left",
              padding: "11px 12px",
              border: "none",
              borderBottom:
                "1px solid var(--border)",
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
              {p.nombres} {p.apellidoPaterno}{" "}
              {p.apellidoMaterno ?? ""}
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              HC: {p.hc}
              {p.dni ? ` · DNI: ${p.dni}` : ""}
            </div>

            {p.sexo && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                {p.sexo === "M"
                  ? "Hombre"
                  : p.sexo === "F"
                  ? "Mujer"
                  : p.sexo}
              </div>
            )}
          </button>
        ))}
      </div>
    )}

  {!buscandoPaciente &&
    pacienteAbierto &&
    busquedaPaciente.trim().length >= 2 &&
    resultadosPaciente.length === 0 && (
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        No se encontraron pacientes.
      </div>
    )}
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

          {!pacienteEncontrado &&
            hc &&
            !buscandoPaciente && (
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
                  ⚠️ Paciente no encontrado.
                  Completa los datos para registrarlo.
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">
                      DNI
                    </label>

                    <input
                      type="text"
                      value={dni}
                      onChange={(e) =>
                        setDni(e.target.value)
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Nombres
                    </label>

                    <input
                      type="text"
                      value={nombres}
                      onChange={(e) =>
                        setNombres(e.target.value)
                      }
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
                        setApellidoPaterno(
                          e.target.value,
                        )
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
                        setApellidoMaterno(
                          e.target.value,
                        )
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Sexo
                    </label>

                    <select
                      value={sexo}
                      onChange={(e) =>
                        setSexo(
                          e.target.value as
                            | "M"
                            | "F"
                            | "",
                        )
                      }
                      className="form-select"
                    >
                      <option value="">
                        Selecciona...
                      </option>

                      <option value="M">
                        Hombre
                      </option>

                      <option value="F">
                        Mujer
                      </option>
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
                        setFechaNacimiento(
                          e.target.value,
                        )
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
            Registra los datos médicos y de
            financiamiento del ingreso.
          </p>

          <div className="form-grid-2">
            <div
              className="form-field"
              ref={medicoRef}
              style={{ position: "relative" }}
            >
              <label className="form-label">
                Médico tratante
              </label>

              {medico ? (
                <div>
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
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {medico}
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
                        setMedico("");
                        setMedicoId(null);
                        setBusquedaMedico("");
                        setResultadosMedico([]);
                        setMedicoAbierto(false);
                      }}
                      className="btn btn-secondary"
                      style={{
                        padding: "6px 10px",
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={busquedaMedico}
                    onChange={(e) =>
                      buscarMedicos(e.target.value)
                    }
                    onFocus={() => {
                      if (
                        busquedaMedico.trim().length >=
                        2
                      ) {
                        setMedicoAbierto(true);
                      }
                    }}
                    placeholder="Buscar médico por nombre, apellido o CMP..."
                    className="form-input"
                    autoComplete="off"
                  />

                  {buscandoMedico &&
                    medicoAbierto && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Buscando médicos...
                      </div>
                    )}

                  {!buscandoMedico &&
                    medicoAbierto &&
                    resultadosMedico.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 30,
                          left: 0,
                          right: 0,
                          top: "100%",
                          marginTop: 4,
                          background: "#fff",
                          border:
                            "1px solid var(--border)",
                          borderRadius: 8,
                          boxShadow:
                            "0 8px 24px rgba(0,0,0,0.12)",
                          maxHeight: 280,
                          overflowY: "auto",
                        }}
                      >
                        {resultadosMedico.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              seleccionarMedico(m)
                            }
                            style={{
                              width: "100%",
                              display: "block",
                              textAlign: "left",
                              padding: "11px 12px",
                              border: "none",
                              borderBottom:
                                "1px solid var(--border)",
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
                              {m.nombres}{" "}
                              {m.apellidoPaterno}{" "}
                              {m.apellidoMaterno ?? ""}
                            </div>

                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              {m.especialidad} ·{" "}
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

                  {!buscandoMedico &&
                    medicoAbierto &&
                    busquedaMedico.trim().length >= 2 &&
                    resultadosMedico.length === 0 && (
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
                <option value="">
                  Selecciona...
                </option>

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
                    setUsaVentilador(
                      e.target.checked,
                    )
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
                    setUsaOxigeno(
                      e.target.checked,
                    )
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
            Busca el diagnóstico por código CIE-10 o por
            descripción. Selecciona uno de los resultados
            para registrarlo.
          </p>

          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {diagnosticos.map((d, i) => {
              const resultados =
                resultadosDiagnostico[i] ?? [];

              const buscando =
                buscandoDiagnostico[i] ?? false;

              const busqueda =
                busquedaDiagnostico[i] ?? "";

              const desplegableAbierto =
                diagnosticoAbierto === i;

              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    padding: 14,
                    border:
                      "1px solid var(--border)",
                    borderRadius: 10,
                    background: "#fafbfd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      DIAGNÓSTICO {i + 1}
                      {i === 0
                        ? " · PRINCIPAL"
                        : ""}
                    </div>

                    {diagnosticos.length > 1 && (
                      <button
                        onClick={() =>
                          quitarDiagnostico(i)
                        }
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          minWidth: 40,
                          padding: "6px 10px",
                        }}
                        aria-label="Eliminar diagnóstico"
                        title="Eliminar diagnóstico"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {!d.cie10Codigo &&
                  !d.cie10Descripcion ? (
                    <div
                      ref={(element) => {
                        diagnosticoRefs.current[i] =
                          element;
                      }}
                      style={{
                        position: "relative",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar por código o descripción..."
                        value={busqueda}
                        onFocus={() => {
                          if (
                            busqueda.trim().length >=
                            2
                          ) {
                            setDiagnosticoAbierto(i);
                          }
                        }}
                        onChange={(e) =>
                          buscarDiagnosticos(
                            i,
                            e.target.value,
                          )
                        }
                        className="form-input"
                        autoComplete="off"
                      />

                      {buscando &&
                        desplegableAbierto && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "var(--muted)",
                            }}
                          >
                            Buscando diagnósticos...
                          </div>
                        )}

                      {!buscando &&
                        desplegableAbierto &&
                        resultados.length > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              zIndex: 20,
                              left: 0,
                              right: 0,
                              top: "100%",
                              marginTop: 4,
                              background: "#fff",
                              border:
                                "1px solid var(--border)",
                              borderRadius: 8,
                              boxShadow:
                                "0 8px 24px rgba(0,0,0,0.12)",
                              maxHeight: 260,
                              overflowY: "auto",
                            }}
                          >
                            {resultados.map(
                              (resultado) => (
                                <button
                                  key={
                                    resultado.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    seleccionarDiagnostico(
                                      i,
                                      resultado,
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    display: "block",
                                    textAlign: "left",
                                    padding:
                                      "10px 12px",
                                    border: "none",
                                    borderBottom:
                                      "1px solid var(--border)",
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
                                    {
                                      resultado.codigo
                                    }
                                  </div>

                                  <div
                                    style={{
                                      marginTop: 2,
                                      fontSize: 12,
                                      color:
                                        "var(--muted)",
                                    }}
                                  >
                                    {
                                      resultado.descripcion
                                    }
                                  </div>
                                </button>
                              ),
                            )}
                          </div>
                        )}

                      {!buscando &&
                        desplegableAbierto &&
                        busqueda.trim().length >= 2 &&
                        resultados.length === 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "var(--muted)",
                            }}
                          >
                            No se encontraron diagnósticos.
                          </div>
                        )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "110px minmax(0, 1fr)",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 7,
                          background:
                            "var(--success-light)",
                          border:
                            "1px solid #b8e2d0",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "var(--success)",
                        }}
                      >
                        {d.cie10Codigo}
                      </div>

                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 7,
                          background: "#fff",
                          border:
                            "1px solid var(--border)",
                          fontSize: 13,
                        }}
                      >
                        {d.cie10Descripcion}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          actualizarDiagnostico(
                            i,
                            "cie10Codigo",
                            "",
                          );

                          actualizarDiagnostico(
                            i,
                            "cie10Descripcion",
                            "",
                          );

                          setBusquedaDiagnostico(
                            (prev) => ({
                              ...prev,
                              [i]: "",
                            }),
                          );

                          setResultadosDiagnostico(
                            (prev) => ({
                              ...prev,
                              [i]: [],
                            }),
                          );

                          setDiagnosticoAbierto(null);
                        }}
                        className="btn btn-secondary"
                        style={{
                          gridColumn: "1 / -1",
                          justifySelf: "start",
                          padding: "7px 12px",
                        }}
                      >
                        Cambiar diagnóstico
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={agregarDiagnostico}
            type="button"
            className="btn btn-secondary"
            style={{
              marginTop: 12,
            }}
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
            Información opcional asociada a situaciones
            que puedan prolongar la estancia hospitalaria.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <label
              style={{
                minHeight: 46,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fafbfd",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1.3,
              }}
            >
              <input
                type="checkbox"
                checked={tieneProblemaJudicial}
                onChange={(e) =>
                  setTieneProblemaJudicial(
                    e.target.checked,
                  )
                }
                style={{
                  width: 16,
                  height: 16,
                  flex: "0 0 16px",
                  margin: 0,
                }}
              />

              <span>Problema judicial</span>
            </label>

            <label
              style={{
                minHeight: 46,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fafbfd",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1.3,
              }}
            >
              <input
                type="checkbox"
                checked={tieneProblemaSocial}
                onChange={(e) =>
                  setTieneProblemaSocial(
                    e.target.checked,
                  )
                }
                style={{
                  width: 16,
                  height: 16,
                  flex: "0 0 16px",
                  margin: 0,
                }}
              />

              <span>Problema social</span>
            </label>
          </div>

          <div
            className="form-field"
            style={{
              marginTop: 16,
            }}
          >
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
              rows={4}
              style={{
                display: "block",
                minHeight: 96,
                resize: "vertical",
              }}
            />
          </div>
        </section>

        {/* CONFIRMACIÓN */}
        <section className="form-section">
          <div className="form-section-title">
            Confirmación del ingreso
          </div>

          <p className="form-section-description">
            Verifica que la información requerida esté
            completa antes de registrar el ingreso.
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
              Se requiere servicio, especialidad,
              cama, identificación del paciente y
              diagnóstico.
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
