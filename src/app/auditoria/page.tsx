"use client";
import { useState, useEffect } from "react";
import {
  Frame,
  Toolbar,
  Table,
  api,
  dateLabel,
  message,
  styles,
} from "@/app/components/Operations";
type Event = {
  id: string;
  entidad: string;
  referencia: string;
  hc: string | null;
  accion: string;
  responsable: string;
  motivo: string | null;
  detalle: string | object | null;
  registradoEn: string;
  fechaEvento: string | null;
};
type Result = { pagina: number; hayMas: boolean; eventos: Event[] };
function detail(value: Event["detalle"]) {
  if (!value) return "Sin detalle adicional";
  try {
    return JSON.stringify(
      typeof value === "string" ? JSON.parse(value) : value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}
export default function AuditPage() {
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [actor, setActor] = useState("");
  const [ref, setRef] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(page = 1) {
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({
        pagina: String(page),
        responsable: actor,
        referencia: ref,
      });
      if (desde) query.set("desde", desde);
      if (hasta) query.set("hasta", hasta);
      setResult(await api<Result>("/api/auditoria?" + query));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api<Result>("/api/auditoria")
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
  return (
    <Frame
      title="Auditoría"
      description="Quién registró cada cambio, cuándo ocurrió y qué información se modificó."
      error={error}
    >
      <Toolbar>
        <label>
          Usuario responsable
          <input
            value={actor}
            maxLength={100}
            onChange={(e) => setActor(e.target.value)}
          />
        </label>
        <label>
          HC o referencia exacta
          <input
            value={ref}
            maxLength={64}
            onChange={(e) => setRef(e.target.value)}
          />
        </label>
        <label>
          Registro desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => load()}
        >
          Filtrar
        </button>
      </Toolbar>
      <p className={styles.notice}>
        La fecha del evento y la fecha de registro son independientes. Los
        movimientos antiguos pueden contener menos detalle; las correcciones
        nuevas conservan el antes, el después y el motivo.
      </p>
      {result && (
        <>
          <Table
            headers={[
              "Registro / evento",
              "Responsable",
              "Entidad / referencia",
              "Acción",
              "Detalle",
            ]}
          >
            {result.eventos.map((e) => (
              <tr key={e.id}>
                <td>
                  {dateLabel(e.registradoEn)}
                  {e.fechaEvento && (
                    <small>Evento: {dateLabel(e.fechaEvento)}</small>
                  )}
                </td>
                <td>{e.responsable}</td>
                <td>
                  {e.entidad} · {e.referencia}
                  {e.hc && <small>HC {e.hc}</small>}
                </td>
                <td>
                  {e.accion}
                  {e.motivo && <small>{e.motivo}</small>}
                </td>
                <td>
                  <details className={styles.details}>
                    <summary>Ver cambios</summary>
                    <pre>{detail(e.detalle)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </Table>
          <Toolbar>
            <button
              className="btn btn-secondary"
              disabled={busy || result.pagina <= 1}
              onClick={() => load(result.pagina - 1)}
            >
              Anterior
            </button>
            <span>Página {result.pagina}</span>
            <button
              className="btn btn-secondary"
              disabled={busy || !result.hayMas}
              onClick={() => load(result.pagina + 1)}
            >
              Siguiente
            </button>
          </Toolbar>
          {!result.eventos.length && (
            <p className={styles.empty}>No hay eventos con estos filtros.</p>
          )}
        </>
      )}
    </Frame>
  );
}
