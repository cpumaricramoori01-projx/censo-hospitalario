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
          servicioDestinoId: servicioDestinoId ? Number(servicioDestinoId) : undefined,
          medicoAlta,
          diagnosticoFinal,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(`✅ Egreso registrado correctamente (id ${data.id}). La cama quedó libre.`);
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
 
  const transferenciaValida = tipoEgreso !== "transferencia" || !!servicioDestinoId;
  const listo = seleccionado && tipoEgreso && transferenciaValida;
 
  return (
    <div style={{ padding: 40, maxWidth: 620, fontFamily: "sans-serif" }}>
      <h1>Registrar egreso de paciente</h1>
 
      <label style={{ display: "block", marginTop: 20 }}>Historia clínica (HC) del paciente internado</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={hc}
          onChange={(e) => setHc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="Ej. 00001234"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={buscar} disabled={!hc || buscando}>
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </div>
 
      {resultados.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {resultados.map((r) => (
            <div
              key={r.ingresoId}
              onClick={() => setSeleccionado(r)}
              style={{
                border: seleccionado?.ingresoId === r.ingresoId ? "2px solid #16a34a" : "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <strong>{r.nombres} {r.apellidoPaterno} {r.apellidoMaterno}</strong>
              <br />
              {r.servicioNombre} — {r.especialidadNombre} — Cama {r.numeroCama}
              <br />
              <span style={{ fontSize: 13, color: "#666" }}>
                Ingresó: {new Date(r.fechaIngreso).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
 
      {seleccionado && (
        <>
          <hr style={{ margin: "24px 0" }} />
 
          <label style={{ display: "block" }}>Tipo de egreso</label>
          <select value={tipoEgreso} onChange={(e) => setTipoEgreso(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">Selecciona...</option>
            {TIPOS_EGRESO.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
 
          {tipoEgreso === "transferencia" && (
            <>
              <label style={{ display: "block", marginTop: 8 }}>Servicio de destino</label>
              <select value={servicioDestinoId} onChange={(e) => setServicioDestinoId(e.target.value)} style={{ width: "100%", padding: 8 }}>
                <option value="">Selecciona el servicio de destino</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </>
          )}
 
          <label style={{ display: "block", marginTop: 8 }}>
            Código de egreso original (opcional)
          </label>
          <input
            type="text"
            value={codigoEgresoOriginal}
            onChange={(e) => setCodigoEgresoOriginal(e.target.value)}
            placeholder="Ej. AH, AL, FA, AV, RE (si lo conoces)"
            style={{ width: "100%", padding: 8 }}
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            Si tu hospital usa un código específico para este tipo de egreso, puedes anotarlo aquí
            mientras confirmamos el significado exacto de cada uno.
          </p>
 
          <label style={{ display: "block", marginTop: 8 }}>Médico que da el alta</label>
          <input type="text" value={medicoAlta} onChange={(e) => setMedicoAlta(e.target.value)} style={{ width: "100%", padding: 8 }} />
 
          <label style={{ display: "block", marginTop: 8 }}>Diagnóstico final</label>
          <input type="text" value={diagnosticoFinal} onChange={(e) => setDiagnosticoFinal(e.target.value)} style={{ width: "100%", padding: 8 }} />
 
          <button
            onClick={registrarEgreso}
            disabled={!listo || enviando}
            style={{ marginTop: 24, padding: "10px 20px", fontWeight: "bold" }}
          >
            {enviando ? "Guardando..." : "Registrar egreso"}
          </button>
        </>
      )}
 
      {mensaje && <p style={{ marginTop: 16 }}>{mensaje}</p>}
    </div>
  );
}
