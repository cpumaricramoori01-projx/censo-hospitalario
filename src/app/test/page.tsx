// =====================================================================
// src/app/test/page.tsx
// Pagina de prueba TEMPORAL para validar la conexion completa:
// Vercel -> API route -> Aiven (MySQL). Borrar cuando ya no se necesite.
// =====================================================================
 
"use client";
 
import { useState } from "react";
 
export default function TestPage() {
  const [nombre, setNombre] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
 
  async function guardarServicio() {
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/test-servicio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json();
      if (res.ok) {
        setResultado(`✅ Guardado con id ${data.id}`);
      } else {
        setResultado(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setResultado(`❌ Error de red: ${String(err)}`);
    } finally {
      setCargando(false);
    }
  }
 
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <h1>Prueba de conexión a la base de datos</h1>
      <p>Escribe un nombre de servicio (ej. "Medicina A") y guárdalo.</p>
 
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del servicio"
        style={{ padding: 8, width: "100%", marginBottom: 12 }}
      />
 
      <button
        onClick={guardarServicio}
        disabled={cargando || !nombre}
        style={{ padding: "8px 16px" }}
      >
        {cargando ? "Guardando..." : "Guardar"}
      </button>
 
      {resultado && <p style={{ marginTop: 16 }}>{resultado}</p>}
    </div>
  );
}
 