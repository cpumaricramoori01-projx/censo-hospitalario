"use client";
import { useState, useEffect } from "react";
import type { monthlyIndicators } from "@/lib/census";
import {
  Frame,
  Toolbar,
  Table,
  Export,
  api,
  today,
  message,
  styles,
} from "@/app/components/Operations";
type Result = ReturnType<typeof monthlyIndicators>;
const number = (v: number | null) =>
  v === null ? "N/D" : v.toLocaleString("es-PE", { maximumFractionDigits: 2 });
export default function MonthlyPage() {
  const [mes, setMes] = useState(() => today().slice(0, 7));
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setResult(await api<Result>(`/api/reportes/indicadores?mes=${mes}`));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api<Result>(`/api/reportes/indicadores?mes=${today().slice(0, 7)}`)
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
  const headers = [
    "Servicio",
    "Pacientes-día",
    "Días-cama",
    "Egresos",
    "Camas promedio",
    "Ocupación %",
    "Permanencia estadística (días)",
    "Rendimiento cama",
    "Sustitución (días)",
  ];
  const cells = (s: Result["total"]) => [
    s.servicio,
    s.pacientesDia,
    s.diasCama ?? "N/D",
    s.egresos,
    number(s.promedioCamas),
    number(s.ocupacion),
    number(s.promedioPermanencia),
    number(s.rendimientoCama),
    number(s.intervaloSustitucion),
  ];
  return (
    <Frame
      title="Indicadores mensuales"
      description="Movimiento y utilización de camas por servicio, calculados sobre días completos."
      error={error}
    >
      <Toolbar>
        <label>
          Mes
          <input
            type="month"
            value={mes}
            max={today().slice(0, 7)}
            onChange={(e) => setMes(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={load}>
          {busy ? "Calculando…" : "Consultar"}
        </button>
      </Toolbar>
      {result && (
        <>
          <div className={styles.cards}>
            {[
              ["Días completos", result.diasCerrados],
              ["Pacientes-día", result.total.pacientesDia],
              ["Egresos", result.total.egresos],
              [
                "Ocupación",
                result.total.ocupacion === null
                  ? "N/D"
                  : number(result.total.ocupacion) + " %",
              ],
            ].map(([label, value]) => (
              <div className={styles.card} key={label}>
                {label}
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className={styles.notice}>
            Mes {result.mes} · corte {result.horaCorte}, hora de Perú. Cálculo
            actualizado desde los eventos; los partes diarios conservan sus
            propias versiones de revisión.
          </p>
          {result.total.diasCama === null && (
            <p className={styles.warning}>
              No hay cobertura completa de capacidad:{" "}
              {result.total.diasConCapacidad} de {result.diasCerrados} días
              conocidos. Ocupación, rendimiento e intervalo se muestran como
              N/D; no se usan las camas actuales para inventar capacidad pasada.
            </p>
          )}
          {result.inconsistencias.length > 0 && (
            <div className={styles.warning}>
              <strong>Indicadores sujetos a revisión de integridad:</strong>
              <ul>
                {result.inconsistencias.slice(0, 30).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          <Export
            name={`indicadores-${result.mes}`}
            headers={headers}
            rows={[...result.servicios.map(cells), cells(result.total)]}
          />
          <Table headers={headers}>
            {[...result.servicios, result.total].map((s) => (
              <tr key={s.servicioId ?? "total"}>
                {cells(s).map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </Table>
          <p className={styles.notice}>{result.metodo}</p>
          <small>
            La permanencia estadística se atribuye al servicio del egreso y
            comprende toda la hospitalización. Es distinta de los días completos
            de 24 horas mostrados en las fichas. Sin egresos o camas
            disponibles, la razón correspondiente es N/D.
          </small>
          <details className={styles.details}>
            <summary>Detalle por día</summary>
            <Table
              headers={[
                "Fecha",
                "Inicial",
                "Ingresos",
                "Egresos",
                "Final",
                "Pacientes-día",
                "Camas",
                "Conciliación",
              ]}
            >
              {result.diario.map((d) => (
                <tr key={d.fecha}>
                  <td>{d.fecha}</td>
                  <td>{d.inicial}</td>
                  <td>{d.ingresos}</td>
                  <td>{d.egresos}</td>
                  <td>{d.final}</td>
                  <td>{d.pacientesDia}</td>
                  <td>{d.camasDisponibles ?? "N/D"}</td>
                  <td>{d.consistente ? "Correcta" : "Revisar"}</td>
                </tr>
              ))}
            </Table>
          </details>
        </>
      )}
    </Frame>
  );
}
