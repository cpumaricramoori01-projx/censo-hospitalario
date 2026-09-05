// src/app/ingresos/nuevo/page.tsx (v3)
 
"use client";
 
import { useEffect, useState } from "react";
 
type Servicio = { id: number; nombre: string };
type Especialidad = { id: number; nombre: string; servicioId: number };
type Cama = { id: number; numero: string; estado: string; ubicacion: string | null };
type Paciente = {
  hc: string;
  dni: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
};
type Diagnostico = { cie10Codigo: string; cie10Descripcion: string };
 
const FINANCIAMIENTOS = ["SIS Gratuito", "SIS Para Todos", "Particular", "Fondo Salud", "Otro"];
 
export default function NuevoIngresoPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
 
  const [servicioId, setServicioId] = useState("");
  const [especialidadId, setEspecialidadId] = useState("");
  const [camaId, setCamaId] = useState("");
 
  const [hc, setHc] = useState("");
  const [pacienteEncontrado, setPacienteEncontrado] = useState<Paciente | null>(null);
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [sexo, setSexo] = useState<"M" | "F" | "">("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
 
  const [medico, setMedico] = useState("");
  const [tipoIngreso, setTipoIngreso] = useState<"normal" | "transferencia">("normal");
  const [servicioOrigenId, setServicioOrigenId] = useState("");
  const [financiamiento, setFinanciamiento] = useState("");
  const [usaVentilador, setUsaVentilador] = useState(false);
  const [usaOxigeno, setUsaOxigeno] = useState(false);
  const [tieneProblemaJudicial, setTieneProblemaJudicial] = useState(false);
  const [tieneProblemaSocial, setTieneProblemaSocial] = useState(false);
  const [notasEstancia, setNotasEstancia] = useState("");
 
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([
    { cie10Codigo: "", cie10Descripcion: "" },
  ]);
 
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
 
  useEffect(() => {
    fetch("/api/servicios").then((r) => r.json()).then(setServicios)
      .catch(() => setMensaje("❌ No se pudieron cargar los servicios"));
  }, []);
 
  useEffect(() => {
    if (!servicioId) { setEspecialidades([]); return; }
    setEspecialidadId(""); setCamas([]); setCamaId("");
    fetch(`/api/especialidades?servicioId=${servicioId}`).then((r) => r.json()).then(setEspecialidades);
  }, [servicioId]);
 
  useEffect(() => {
    if (!especialidadId) { setCamas([]); return; }
    setCamaId("");
    fetch(`/api/camas?especialidadId=${especialidadId}`).then((r) => r.json()).then(setCamas);
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
        setFechaNacimiento(data.fechaNacimiento ? String(data.fechaNacimiento).slice(0, 10) : "");
      } else {
        setPacienteEncontrado(null);
        setDni(""); setNombres(""); setApellidoPaterno(""); setApellidoMaterno("");
        setSexo(""); setFechaNacimiento("");
      }
    } finally {
      setBuscandoPaciente(false);
    }
  }
 
  function actualizarDiagnostico(i: number, campo: keyof Diagnostico, valor: string) {
    setDiagnosticos((prev) => prev.map((d, idx) => (idx === i ? { ...d, [campo]: valor } : d)));
  }
  function agregarDiagnostico() {
    setDiagnosticos((prev) => [...prev, { cie10Codigo: "", cie10Descripcion: "" }]);
  }
  function quitarDiagnostico(i: number) {
    setDiagnosticos((prev) => prev.filter((_, idx) => idx !== i));
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
          apellidoPaterno: pacienteEncontrado ? undefined : apellidoPaterno,
          apellidoMaterno: pacienteEncontrado ? undefined : apellidoMaterno,
          sexo: pacienteEncontrado ? undefined : sexo,
          fechaNacimiento: pacienteEncontrado ? undefined : fechaNacimiento || undefined,
          camaId: Number(camaId),
          medico,
          tipoIngreso,
          servicioOrigenId: servicioOrigenId ? Number(servicioOrigenId) : undefined,
          financiamiento,
          usaVentilador,
          usaOxigeno,
          tieneProblemaJudicial,
          tieneProblemaSocial,
          notasEstancia,
          diagnosticos: diagnosticos.filter((d) => d.cie10Descripcion.trim() !== ""),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(`✅ Ingreso registrado correctamente (id ${data.id})`);
        setHc(""); setPacienteEncontrado(null);
        setDni(""); setNombres(""); setApellidoPaterno(""); setApellidoMaterno("");
        setSexo(""); setFechaNacimiento("");
        setMedico(""); setTipoIngreso("normal"); setServicioOrigenId("");
        setFinanciamiento(""); setUsaVentilador(false); setUsaOxigeno(false);
        setTieneProblemaJudicial(false); setTieneProblemaSocial(false); setNotasEstancia("");
        setDiagnosticos([{ cie10Codigo: "", cie10Descripcion: "" }]);
        setCamaId("");
        if (especialidadId) {
          fetch(`/api/camas?especialidadId=${especialidadId}`).then((r) => r.json()).then(setCamas);
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
 
  const diagnosticoValido = diagnosticos.some((d) => d.cie10Descripcion.trim() !== "");
  const transferenciaValida = tipoIngreso === "normal" || !!servicioOrigenId;
  const datosNuevoPacienteValidos = pacienteEncontrado || (nombres && apellidoPaterno && sexo);
  const listo =
    servicioId && especialidadId && camaId && hc && diagnosticoValido &&
    transferenciaValida && datosNuevoPacienteValidos;
 
  return (
    <div style={{ padding: 40, maxWidth: 620, fontFamily: "sans-serif" }}>
      <h1>Registrar ingreso de paciente</h1>
 
      <label style={{ display: "block", marginTop: 20 }}>Servicio</label>
      <select value={servicioId} onChange={(e) => setServicioId(e.target.value)} style={{ width: "100%", padding: 8 }}>
        <option value="">Selecciona un servicio</option>
        {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
 
      {servicioId && (
        <>
          <label style={{ display: "block", marginTop: 12 }}>Especialidad</label>
          <select value={especialidadId} onChange={(e) => setEspecialidadId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">Selecciona una especialidad</option>
            {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </>
      )}
 
      {especialidadId && (
        <>
          <label style={{ display: "block", marginTop: 12 }}>Cama libre</label>
          <select value={camaId} onChange={(e) => setCamaId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">{camas.length === 0 ? "No hay camas libres" : "Selecciona una cama"}</option>
            {camas.map((c) => (
              <option key={c.id} value={c.id}>Cama {c.numero} {c.ubicacion ? `— ${c.ubicacion}` : ""}</option>
            ))}
          </select>
        </>
      )}
 
      <hr style={{ margin: "24px 0" }} />
 
      <label style={{ display: "block" }}>Tipo de ingreso</label>
      <select value={tipoIngreso} onChange={(e) => setTipoIngreso(e.target.value as "normal" | "transferencia")} style={{ width: "100%", padding: 8 }}>
        <option value="normal">Ingreso normal</option>
        <option value="transferencia">Admitido por transferencia</option>
      </select>
 
      {tipoIngreso === "transferencia" && (
        <>
          <label style={{ display: "block", marginTop: 8 }}>Servicio de origen</label>
          <select value={servicioOrigenId} onChange={(e) => setServicioOrigenId(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">Selecciona el servicio de origen</option>
            {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </>
      )}
 
      <hr style={{ margin: "24px 0" }} />
 
      <label style={{ display: "block" }}>Historia clínica (HC)</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="text" value={hc} onChange={(e) => setHc(e.target.value)} onBlur={buscarPaciente} placeholder="Ej. 00001234" style={{ flex: 1, padding: 8 }} />
        <button onClick={buscarPaciente} disabled={!hc || buscandoPaciente}>{buscandoPaciente ? "Buscando..." : "Buscar"}</button>
      </div>
 
      {pacienteEncontrado && (
        <p style={{ color: "green" }}>
          ✅ {pacienteEncontrado.nombres} {pacienteEncontrado.apellidoPaterno} {pacienteEncontrado.apellidoMaterno}
          {pacienteEncontrado.sexo ? ` — ${pacienteEncontrado.sexo === "M" ? "Hombre" : "Mujer"}` : ""}
        </p>
      )}
      {!pacienteEncontrado && hc && !buscandoPaciente && (
        <>
          <p style={{ color: "#b45309" }}>⚠️ Paciente no encontrado. Completa sus datos:</p>
          <label style={{ display: "block", marginTop: 8 }}>DNI</label>
          <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} style={{ width: "100%", padding: 8 }} />
          <label style={{ display: "block", marginTop: 8 }}>Nombres</label>
          <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} style={{ width: "100%", padding: 8 }} />
          <label style={{ display: "block", marginTop: 8 }}>Apellido paterno</label>
          <input type="text" value={apellidoPaterno} onChange={(e) => setApellidoPaterno(e.target.value)} style={{ width: "100%", padding: 8 }} />
          <label style={{ display: "block", marginTop: 8 }}>Apellido materno</label>
          <input type="text" value={apellidoMaterno} onChange={(e) => setApellidoMaterno(e.target.value)} style={{ width: "100%", padding: 8 }} />
 
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block" }}>Sexo</label>
              <select value={sexo} onChange={(e) => setSexo(e.target.value as "M" | "F")} style={{ width: "100%", padding: 8 }}>
                <option value="">Selecciona...</option>
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block" }}>Fecha de nacimiento</label>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </div>
          </div>
        </>
      )}
 
      <hr style={{ margin: "24px 0" }} />
 
      <label style={{ display: "block" }}>Médico tratante</label>
      <input type="text" value={medico} onChange={(e) => setMedico(e.target.value)} style={{ width: "100%", padding: 8 }} />
 
      <label style={{ display: "block", marginTop: 8 }}>Financiamiento</label>
      <select value={financiamiento} onChange={(e) => setFinanciamiento(e.target.value)} style={{ width: "100%", padding: 8 }}>
        <option value="">Selecciona...</option>
        {FINANCIAMIENTOS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
 
      <div style={{ marginTop: 12 }}>
        <label><input type="checkbox" checked={usaVentilador} onChange={(e) => setUsaVentilador(e.target.checked)} /> Usa ventilador mecánico</label><br />
        <label><input type="checkbox" checked={usaOxigeno} onChange={(e) => setUsaOxigeno(e.target.checked)} /> Usa oxígeno</label>
      </div>
 
      <hr style={{ margin: "24px 0" }} />
 
      <label style={{ display: "block", fontWeight: "bold" }}>Diagnósticos</label>
      {diagnosticos.map((d, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input type="text" placeholder="Código CIE-10 (opcional)" value={d.cie10Codigo} onChange={(e) => actualizarDiagnostico(i, "cie10Codigo", e.target.value)} style={{ width: 140, padding: 8 }} />
          <input type="text" placeholder="Descripción del diagnóstico" value={d.cie10Descripcion} onChange={(e) => actualizarDiagnostico(i, "cie10Descripcion", e.target.value)} style={{ flex: 1, padding: 8 }} />
          {diagnosticos.length > 1 && <button onClick={() => quitarDiagnostico(i)} type="button">✕</button>}
        </div>
      ))}
      <button onClick={agregarDiagnostico} type="button" style={{ marginTop: 8 }}>+ Agregar otro diagnóstico</button>
 
      <hr style={{ margin: "24px 0" }} />
 
      <label style={{ display: "block", fontWeight: "bold" }}>Estancia prolongada (opcional)</label>
      <div style={{ marginTop: 8 }}>
        <label><input type="checkbox" checked={tieneProblemaJudicial} onChange={(e) => setTieneProblemaJudicial(e.target.checked)} /> Problema judicial</label><br />
        <label><input type="checkbox" checked={tieneProblemaSocial} onChange={(e) => setTieneProblemaSocial(e.target.checked)} /> Problema social</label>
      </div>
      <textarea placeholder="Notas adicionales (opcional)" value={notasEstancia} onChange={(e) => setNotasEstancia(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 8, minHeight: 60 }} />
 
      <button onClick={registrarIngreso} disabled={!listo || enviando} style={{ marginTop: 24, padding: "10px 20px", fontWeight: "bold" }}>
        {enviando ? "Guardando..." : "Registrar ingreso"}
      </button>
 
      {mensaje && <p style={{ marginTop: 16 }}>{mensaje}</p>}
    </div>
  );
}