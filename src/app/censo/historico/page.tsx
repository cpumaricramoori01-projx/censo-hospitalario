"use client";
import { useState, useEffect } from "react";
import type { historicalCensus } from "@/lib/census";
import {
  Frame,
  Toolbar,
  Table,
  Export,
  PatientLink,
  api,
  today,
  dateLabel,
  message,
  styles,
} from "@/app/components/Operations";
type Result = ReturnType<typeof historicalCensus> & {
  fecha: string;
  hora: string;
  instante: string;
  nota: string;
};
export default function HistoricalPage() {
  const [fecha, setFecha] = useState(today);
  const [hora, setHora] = useState("00:00");
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  async function load(f = fecha, h = hora) {
    setBusy(true);
    setError("");
    try {
      setResult(await api<Result>(`/api/censo/historico?fecha=${f}&hora=${h}`));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api<Result>(`/api/censo/historico?fecha=${today()}&hora=00:00`)
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
    result?.pacientes.filter(
      (p) =>
        !filter ||
        [p.paciente, p.hc, p.servicio, p.cama]
          .join(" ")
          .toLowerCase()
          .includes(filter.toLowerCase()),
    ) ?? [];
  const headers = [
    "HC",
    "Paciente",
    "Servicio",
    "Especialidad",
    "Cama",
    "Ingreso",
  ];
  return (
    <Frame
      title="Censo histórico"
      description="Reconstruye la ubicación de los pacientes a una fecha y hora de Perú."
      error={error}
    >
      <Toolbar>
        <label>
          Fecha
          <input
            type="date"
            value={fecha}
            max={today()}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>
        <label>
          Hora
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => load()}
        >
          {busy ? "Consultando…" : "Consultar"}
        </button>
        <label>
          Buscar
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Paciente, HC, servicio o cama"
          />
        </label>
      </Toolbar>
      {result && (
        <>
          <p className={styles.notice}>
            Corte: {dateLabel(result.instante)} · {rows.length} pacientes.{" "}
            {result.nota}
          </p>
          {result.inconsistencias.length > 0 && (
            <div className={styles.warning}>
              <strong>Revisar integridad</strong>
              <ul>
                {result.inconsistencias.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          <Export
            name={`censo-${result.fecha}-${result.hora.replaceAll(":", "-")}`}
            headers={headers}
            rows={rows.map((p) => [
              p.hc,
              p.paciente,
              p.servicio,
              p.especialidad,
              p.cama,
              dateLabel(p.fechaIngreso),
            ])}
          />
          <Table headers={headers}>
            {rows.map((p) => (
              <tr key={`${p.ingresoId}-${p.camaId}`}>
                <td>{p.hc}</td>
                <td>
                  <PatientLink id={p.ingresoId}>{p.paciente}</PatientLink>
                </td>
                <td>{p.servicio}</td>
                <td>{p.especialidad}</td>
                <td>{p.cama}</td>
                <td>{dateLabel(p.fechaIngreso)}</td>
              </tr>
            ))}
          </Table>
          {!rows.length && (
            <p className={styles.empty}>
              No hay pacientes registrados al corte seleccionado.
            </p>
          )}
        </>
      )}
    </Frame>
  );
}
