"use client";
import { useState, useEffect } from "react";
import type { DailyReport } from "@/lib/census";
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
type Result = {
  estado: string;
  version: number;
  versionMostrada: number | null;
  esVersionGuardada: boolean;
  hayCambios: boolean;
  reporte: DailyReport;
  actual: DailyReport;
  puedeCerrar: boolean;
  versiones: {
    version: number;
    responsable: string;
    registradoEn: string;
    motivo: string;
  }[];
};
const yesterday = () =>
  new Date(Date.now() - 5 * 3600000 - 86400000).toISOString().slice(0, 10);
export default function DailyPage() {
  const [fecha, setFecha] = useState(yesterday);
  const [result, setResult] = useState<Result>();
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(f = fecha, v = version) {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<Result>(
          `/api/censo/parte?fecha=${f}${v ? `&version=${v}` : ""}`,
        ),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api<Result>(`/api/censo/parte?fecha=${yesterday()}`)
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
  async function action(accion: string) {
    if (!result || result.reporte.fecha !== fecha || version) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/censo/parte", {
        fecha,
        accion,
        version: result.version,
        motivo,
      });
      setVersion("");
      setMotivo("");
      await load(fecha, "");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const versionMatches =
    result &&
    (version
      ? result.versionMostrada === Number(version)
      : result.estado === "cerrado"
        ? result.versionMostrada === result.version
        : !result.esVersionGuardada);
  const r =
    result?.reporte.fecha === fecha && versionMatches
      ? result.reporte
      : undefined;
  const headers = [
    "Servicio",
    "Inicial",
    "Ingresos",
    "Recibidos",
    "Enviados",
    "Egresos",
    "Fallecidos*",
    "Final",
    "Esperado",
    "Diferencia",
    "Pacientes-día",
    "Camas habilitadas",
  ];
  function cells(s: DailyReport["total"]) {
    return [
      s.inicial,
      s.ingresos,
      s.recibidos,
      s.enviados,
      s.egresos,
      s.fallecidos,
      s.final,
      s.esperado,
      s.diferencia,
      s.pacientesDia,
      s.camasDisponibles ?? "N/D",
    ];
  }
  return (
    <Frame
      title="Parte diario"
      description="Conciliación por servicio, revisión diaria y versiones de los cierres."
      error={error}
    >
      <Toolbar>
        <label>
          Fecha del período
          <input
            type="date"
            max={today()}
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setResult(undefined);
              setVersion("");
            }}
          />
        </label>
        <label>
          Versión
          <select value={version} onChange={(e) => setVersion(e.target.value)}>
            <option value="">Actual / último cierre</option>
            {result?.versiones.map((v) => (
              <option key={v.version} value={v.version}>
                Versión {v.version}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => load()}
        >
          Consultar
        </button>
      </Toolbar>
      {r && result && (
        <>
          <p className={styles.notice}>
            {dateLabel(r.inicio)} → {dateLabel(r.fin)} · Estado:{" "}
            <strong>{result.estado}</strong> ·{" "}
            {result.esVersionGuardada
              ? `Versión guardada ${result.versionMostrada}`
              : "Cálculo actual"}
            .{" "}
            {r.completo
              ? "Período completo."
              : "Período en curso: datos provisionales."}
          </p>
          {!r.capacidadConocida && (
            <p className={styles.warning}>
              Capacidad histórica no disponible para este día. El movimiento de
              pacientes sí se puede revisar.
            </p>
          )}
          {r.inconsistencias.length > 0 && (
            <div className={styles.warning}>
              <strong>No se puede cerrar hasta resolver:</strong>
              <ul>
                {r.inconsistencias.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          {result.hayCambios && (
            <p className={styles.warning}>
              El cálculo actual difiere de la última versión guardada. Las
              versiones anteriores se conservan.
            </p>
          )}
          <Export
            name={`parte-${r.fecha}-v${result.versionMostrada ?? "actual"}`}
            headers={headers}
            rows={[
              ...r.servicios.map((s) => [s.servicio, ...cells(s)]),
              ["Total hospital", ...cells(r.total)],
            ]}
          />
          <Table headers={headers}>
            {r.servicios.map((s) => (
              <tr key={s.servicioId}>
                <th scope="row">{s.servicio}</th>
                {cells(s).map((v, n) => (
                  <td key={n}>{v}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Total hospital</th>
              {cells(r.total).map((v, n) => (
                <td key={n}>
                  <strong>{v}</strong>
                </td>
              ))}
            </tr>
          </Table>
          <small>
            * Fallecidos están incluidos en egresos. Inicial + ingresos +
            recibidos − enviados − egresos = final. Los cambios de cama dentro
            del mismo servicio no aumentan los traslados entre servicios.
          </small>
          <p className={styles.notice}>{r.metodo}</p>
          {result.puedeCerrar && r.completo && !version && (
            <section className={styles.details}>
              <h2>Revisión del día</h2>
              <label htmlFor="close-reason">
                Motivo del cierre o corrección
              </label>
              <textarea
                id="close-reason"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={2000}
                placeholder="Para reabrir o generar una nueva versión, indica el motivo"
              />
              <div className={styles.actions}>
                {result.estado === "cerrado" ? (
                  <button
                    className="btn btn-secondary"
                    disabled={busy || !motivo.trim()}
                    onClick={() => action("reabrir")}
                  >
                    Reabrir para corregir
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled={
                      busy ||
                      Boolean(r.inconsistencias.length) ||
                      (result.version > 0 && !motivo.trim())
                    }
                    onClick={() => action("cerrar")}
                  >
                    Cerrar y guardar versión {result.version + 1}
                  </button>
                )}
              </div>
              <small>
                Para un registro atrasado, reabre también los días cerrados
                posteriores que puedan resultar afectados. Después verifica y
                cierra nuevamente.
              </small>
            </section>
          )}
          <details className={styles.details}>
            <summary>Pacientes al cierre ({r.pacientes.length})</summary>
            <Table headers={["HC", "Paciente", "Servicio", "Cama"]}>
              {r.pacientes.map((p) => (
                <tr key={`${p.ingresoId}-${p.camaId}`}>
                  <td>{p.hc}</td>
                  <td>
                    <PatientLink id={p.ingresoId}>{p.paciente}</PatientLink>
                  </td>
                  <td>{p.servicio}</td>
                  <td>{p.cama}</td>
                </tr>
              ))}
            </Table>
          </details>
          <section className={styles.details}>
            <h2>Versiones conservadas</h2>
            {result.versiones.length ? (
              <Table
                headers={[
                  "Versión",
                  "Registrado por",
                  "Fecha de registro",
                  "Motivo",
                ]}
              >
                {result.versiones.map((v) => (
                  <tr key={v.version}>
                    <td>{v.version}</td>
                    <td>{v.responsable}</td>
                    <td>{dateLabel(v.registradoEn)}</td>
                    <td>{v.motivo}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p>Todavía no se ha cerrado este día.</p>
            )}
          </section>
        </>
      )}
    </Frame>
  );
}
