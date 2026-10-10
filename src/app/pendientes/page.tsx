"use client";
import { useState, useEffect } from "react";
import {
  Frame,
  Toolbar,
  Table,
  PatientLink,
  api,
  message,
  dateLabel,
  styles,
} from "@/app/components/Operations";
type Result = {
  historicos: {
    ingresoA: number;
    ingresoB: number;
    hc: string;
    inicioA: string;
    finA: string | null;
    inicioB: string;
    finB: string | null;
  }[];
  hayMasHistoricos: boolean;
  alertaEstancia: number;
  nota: string;
  integridad: { asignacionesInvalidas: number; camasSinEstructura: number };
  pendientes: {
    ingresoId: number;
    hc: string;
    paciente: string;
    servicio: string;
    estancia: number;
    prioridad: string;
    motivos: string[];
  }[];
};
export default function PendingPage() {
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setResult(await api<Result>("/api/censo/pendientes"));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api<Result>("/api/censo/pendientes")
      .then((d) => {
        if (active) setResult(d);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const rows =
    result?.pendientes.filter((p) =>
      [p.paciente, p.hc, p.servicio, ...p.motivos]
        .join(" ")
        .toLowerCase()
        .includes(filter.toLowerCase()),
    ) ?? [];
  return (
    <Frame
      title="Pendientes de revisión"
      description="Datos incompletos, seguimiento social y judicial, estancias prolongadas e integridad de las asignaciones."
      error={error}
    >
      <Toolbar>
        <label>
          Buscar
          <input value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={load}>
          Actualizar
        </button>
      </Toolbar>
      {result && (
        <>
          <p className={styles.notice}>
            {result.nota} El aviso de estancia se activa desde{" "}
            {result.alertaEstancia} días y se ajusta en Configuración.
          </p>
          {Boolean(
            result.integridad.asignacionesInvalidas ||
            result.integridad.camasSinEstructura,
          ) && (
            <p className={styles.warning}>
              Integridad: {result.integridad.asignacionesInvalidas} asignaciones
              inválidas y {result.integridad.camasSinEstructura} camas sin
              estructura. Revisa estas inconsistencias antes de cerrar partes.
            </p>
          )}
          <Table
            headers={[
              "Prioridad",
              "HC / Paciente",
              "Servicio",
              "Estancia",
              "Motivos",
            ]}
          >
            {rows.map((p) => (
              <tr key={p.ingresoId}>
                <td>{p.prioridad}</td>
                <td>
                  {p.hc}
                  <br />
                  <PatientLink id={p.ingresoId}>{p.paciente}</PatientLink>
                </td>
                <td>{p.servicio}</td>
                <td>{p.estancia} días</td>
                <td>
                  <ul>
                    {p.motivos.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </Table>
          {result.historicos.length > 0 && (
            <section className={styles.details}>
              <h2>Hospitalizaciones históricas solapadas</h2>
              <p>
                Una misma historia clínica aparece en dos hospitalizaciones al
                mismo tiempo. Revisa las fechas originales antes de corregir.
                Estas inconsistencias bloquean los partes afectados.
              </p>
              <Table
                headers={[
                  "HC",
                  "Primera hospitalización",
                  "Segunda hospitalización",
                ]}
              >
                {result.historicos.map((h) => (
                  <tr key={`${h.ingresoA}-${h.ingresoB}`}>
                    <td>{h.hc}</td>
                    <td>
                      <PatientLink id={h.ingresoA}>
                        Ingreso {h.ingresoA}
                      </PatientLink>
                      <small>
                        {dateLabel(h.inicioA)} → {dateLabel(h.finA)}
                      </small>
                    </td>
                    <td>
                      <PatientLink id={h.ingresoB}>
                        Ingreso {h.ingresoB}
                      </PatientLink>
                      <small>
                        {dateLabel(h.inicioB)} → {dateLabel(h.finB)}
                      </small>
                    </td>
                  </tr>
                ))}
              </Table>
              {result.hayMasHistoricos && (
                <p>Se muestran las primeras 100 coincidencias.</p>
              )}
            </section>
          )}
          {!rows.length && (
            <p className={styles.empty}>No hay pendientes con estos filtros.</p>
          )}
        </>
      )}
    </Frame>
  );
}
