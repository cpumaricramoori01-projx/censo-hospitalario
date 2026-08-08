// src/app/ingresos/nuevo/page.tsx
// Formulario de registro de ingreso de paciente.

"use client";

import { useEffect, useState } from "react";

type Servicio = { id: number; nombre: string };
type Especialidad = { id: number; nombre: string; servicioId: number };
type Cama = { id: number; numero: string; estado: string };
type Paciente = {
  hc: string;
  nombres: string;
  apellidos: string;
};

export default function NuevoIngresoPage() {
  // Listas cargadas de la base de datos
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);

  // Selecciones del usuario
  const [servicioId, setServicioId] = useState<string>("");
  const [especialidadId, setEspecialidadId] = useState<string>("");
  const [camaId, setCamaId] = useState<string>("");

  // Datos del paciente
  const [hc, setHc] = useState("");
  const [pacienteEncontrado, setPacienteEncontrado] = useState<Paciente | null>(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");

  // Datos clinicos
  const [diagnostico, setDiagnostico] = useState("");
  const [medico, setMedico] = useState("");

  // Estado de envio
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Carga servicios al iniciar
  useEffect(() => {
    fetch("/api/servicios")
      .then((r) => r.json())
      .then(setServicios)
      .catch(() => setMensaje("❌ No se pudieron cargar los servicios"));
  }, []);

  // Carga especialidades cuando cambia el servicio
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

  // Carga camas libres cuando cambia la especialidad
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

  // Busca al paciente cuando el usuario termina de escribir el HC
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
        setNombres(data.nombres);
        setApellidos(data.apellidos);
      } else {
        // No encontrado: dejamos los campos vacios para que el usuario los llene
        setPacienteEncontrado(null);
        setNombres("");
        setApellidos("");
      }
    } finally {
      setBuscandoPaciente(false);
    }
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
          nombres: pacienteEncontrado ? undefined : nombres,
          apellidos: pacienteEncontrado ? undefined : apellidos,
          camaId: Number(camaId),
          diagnostico,
          medico,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(`✅ Ingreso registrado correctamente (id ${data.id})`);
        // Limpia el formulario para el siguiente ingreso
        setHc("");
        setPacienteEncontrado(null);
        setNombres("");
        setApellidos("");
        setDiagnostico("");
        setMedico("");
        setCamaId("");
        // Vuelve a cargar camas libres (la que se uso ya no aparecera)
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

  const listo = servicioId && especialidadId && camaId && hc && diagnostico;

  return (
    <div style={{ padding: 40, maxWidth: 560, fontFamily: "sans-serif" }}>
      <h1>Registrar ingreso de paciente</h1>

      {/* Servicio */}
      <label style={{ display: "block", marginTop: 20 }}>Servicio</label>
      <select
        value={servicioId}
        onChange={(e) => setServicioId(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      >
        <option value="">Selecciona un servicio</option>
        {servicios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>

      {/* Especialidad */}
      {servicioId && (
        <>
          <label style={{ display: "block", marginTop: 12 }}>Especialidad</label>
          <select
            value={especialidadId}
            onChange={(e) => setEspecialidadId(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Selecciona una especialidad</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Cama */}
      {especialidadId && (
        <>
          <label style={{ display: "block", marginTop: 12 }}>Cama libre</label>
          <select
            value={camaId}
            onChange={(e) => setCamaId(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">
              {camas.length === 0 ? "No hay camas libres" : "Selecciona una cama"}
            </option>
            {camas.map((c) => (
              <option key={c.id} value={c.id}>
                Cama {c.numero}
              </option>
            ))}
          </select>
        </>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* HC del paciente */}
      <label style={{ display: "block" }}>Historia clínica (HC)</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={hc}
          onChange={(e) => setHc(e.target.value)}
          onBlur={buscarPaciente}
          placeholder="Ej. 00001234"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={buscarPaciente} disabled={!hc || buscandoPaciente}>
          {buscandoPaciente ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {pacienteEncontrado && (
        <p style={{ color: "green" }}>
          ✅ Paciente encontrado: {pacienteEncontrado.nombres}{" "}
          {pacienteEncontrado.apellidos}
        </p>
      )}
      {!pacienteEncontrado && hc && !buscandoPaciente && (
        <p style={{ color: "#b45309" }}>
          ⚠️ Paciente no encontrado. Completa los datos para registrarlo:
        </p>
      )}

      {/* Datos del paciente si no existe */}
      {!pacienteEncontrado && hc && (
        <>
          <label style={{ display: "block", marginTop: 8 }}>Nombres</label>
          <input
            type="text"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
          <label style={{ display: "block", marginTop: 8 }}>Apellidos</label>
          <input
            type="text"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* Datos clinicos */}
      <label style={{ display: "block" }}>Diagnóstico</label>
      <input
        type="text"
        value={diagnostico}
        onChange={(e) => setDiagnostico(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <label style={{ display: "block", marginTop: 8 }}>Médico tratante</label>
      <input
        type="text"
        value={medico}
        onChange={(e) => setMedico(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <button
        onClick={registrarIngreso}
        disabled={!listo || enviando}
        style={{ marginTop: 20, padding: "10px 20px", fontWeight: "bold" }}
      >
        {enviando ? "Guardando..." : "Registrar ingreso"}
      </button>

      {mensaje && <p style={{ marginTop: 16 }}>{mensaje}</p>}
    </div>
  );
}