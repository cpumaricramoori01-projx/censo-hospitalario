"use client";
import { use } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/Icon";
import ClinicalLookup from "@/app/components/ClinicalLookup";
import { fechaHospital, fechaLocalInput, diasEstancia } from "@/lib/hospital";
type Flags = {
  usaOxigeno: boolean;
  usaVentilador: boolean;
  tieneProblemaJudicial: boolean;
  tieneProblemaSocial: boolean;
};
type Diagnosis = { cie10Codigo: string | null; cie10Descripcion: string };
type Period = {
  id: number;
  camaId: number;
  servicioId: number;
  servicio: string;
  especialidad: string;
  cama: string;
  desde: string;
  hasta: string | null;
};
type Detail = {
  ingreso: Flags & {
    id: number;
    hc: string;
    medicoId: number | null;
    medico: string | null;
    fechaIngreso: string;
    fechaRegistro: string;
    registradoPor: string;
    notasEstancia: string | null;
    financiamiento: string | null;
  };
  paciente: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    dni: string | null;
  };
  egreso: { fechaEgreso: string; tipoEgreso: string } | null;
  medico: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
  } | null;
  diagnosticos: Diagnosis[];
  ubicaciones: Period[];
  historial: {
    id: number;
    tipo: string;
    fecha: string;
    fechaRegistro: string;
    responsable: string;
    motivo: string | null;
    detalle: string | null;
  }[];
  puedeEditar: boolean;
};
type Option = { id: number; nombre?: string; numero?: string };
const flagLabels: Record<keyof Flags, string> = {
  usaOxigeno: "Usa oxígeno",
  usaVentilador: "Usa ventilador",
  tieneProblemaJudicial: "Problema judicial",
  tieneProblemaSocial: "Problema social",
};
export default function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "transfer">("view");
  const [flags, setFlags] = useState<Flags>({
    usaOxigeno: false,
    usaVentilador: false,
    tieneProblemaJudicial: false,
    tieneProblemaSocial: false,
  });
  const [doctor, setDoctor] = useState<{ id: number; nombre: string } | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [specialties, setSpecialties] = useState<Option[]>([]);
  const [beds, setBeds] = useState<Option[]>([]);
  const [service, setService] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bed, setBed] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  async function load() {
    const r = await fetch(`/api/hospitalizaciones/${id}`, {
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
    setFlags({
      usaOxigeno: d.ingreso.usaOxigeno,
      usaVentilador: d.ingreso.usaVentilador,
      tieneProblemaJudicial: d.ingreso.tieneProblemaJudicial,
      tieneProblemaSocial: d.ingreso.tieneProblemaSocial,
    });
    setNotes(d.ingreso.notasEstancia ?? "");
    setDiagnoses(d.diagnosticos);
    setDoctor(
      d.ingreso.medicoId
        ? { id: d.ingreso.medicoId, nombre: d.ingreso.medico ?? "" }
        : null,
    );
  }
  useEffect(() => {
    let stopped = false;
    fetch(`/api/hospitalizaciones/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!stopped) {
          setData(d);
          setFlags({
            usaOxigeno: d.ingreso.usaOxigeno,
            usaVentilador: d.ingreso.usaVentilador,
            tieneProblemaJudicial: d.ingreso.tieneProblemaJudicial,
            tieneProblemaSocial: d.ingreso.tieneProblemaSocial,
          });
          setNotes(d.ingreso.notasEstancia ?? "");
          setDiagnoses(d.diagnosticos);
          setDoctor(
            d.ingreso.medicoId
              ? { id: d.ingreso.medicoId, nombre: d.ingreso.medico ?? "" }
              : null,
          );
        }
      })
      .catch((e) => {
        if (!stopped) setError(e.message);
      });
    return () => {
      stopped = true;
    };
  }, [id]);
  useEffect(() => {
    if (mode !== "transfer") return;
    fetch("/api/servicios")
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los servicios");
        setServices(await r.json());
      })
      .catch((e) => setError(e.message));
  }, [mode]);
  useEffect(() => {
    if (!service) return;
    const c = new AbortController();
    fetch(`/api/especialidades?servicioId=${service}`, { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar las especialidades");
        setSpecialties(await r.json());
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [service]);
  useEffect(() => {
    if (!specialty) return;
    const c = new AbortController();
    fetch(`/api/camas?especialidadId=${specialty}`, { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar las camas");
        setBeds(await r.json());
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [specialty]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const transfer = mode === "transfer";
      const r = await fetch(
        `/api/hospitalizaciones/${id}${transfer ? "/traslados" : ""}`,
        {
          method: transfer ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            transfer
              ? { camaId: Number(bed), motivo: reason, fecha: date }
              : {
                  ...flags,
                  medicoId: doctor?.id,
                  notasEstancia: notes,
                  diagnosticos: diagnoses,
                },
          ),
        },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setMode("view");
      setMessage(
        transfer
          ? "Traslado registrado. La hospitalización continúa."
          : "Información actualizada y guardada en el historial.",
      );
      setService("");
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <section>
        <h1>Ficha de hospitalización</h1>
        {error ? (
          <p role="alert" className="error-message">
            {error}
          </p>
        ) : (
          <p>Cargando información…</p>
        )}
        <Link href="/censo">Volver al censo</Link>
      </section>
    );
  const current = data.ubicaciones.at(-1);
  const name = [
    data.paciente.nombres,
    data.paciente.apellidoPaterno,
    data.paciente.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <header className="page-heading">
        <p className="page-kicker">Hospitalización #{data.ingreso.id}</p>
        <h1>{name}</h1>
        <p>
          HC {data.ingreso.hc} ·{" "}
          {data.egreso ? "Hospitalización cerrada" : "Hospitalización activa"} ·{" "}
          {diasEstancia(data.ingreso.fechaIngreso, data.egreso?.fechaEgreso)}{" "}
          días completos
        </p>
        <Link href="/censo">← Volver al censo</Link>
      </header>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
      <div className="detail-grid">
        <div>
          <section className="detail-card">
            <h2>Resumen de la estancia</h2>
            <dl>
              <div>
                <dt>Ingreso</dt>
                <dd>{fechaHospital(data.ingreso.fechaIngreso, true)}</dd>
              </div>
              <div>
                <dt>Ubicación {data.egreso ? "al egreso" : "actual"}</dt>
                <dd>
                  {current?.servicio} / {current?.especialidad} / cama{" "}
                  {current?.cama}
                </dd>
              </div>
              <div>
                <dt>Médico responsable</dt>
                <dd>{data.ingreso.medico || "Sin médico registrado"}</dd>
              </div>
              <div>
                <dt>Financiamiento</dt>
                <dd>{data.ingreso.financiamiento || "—"}</dd>
              </div>
            </dl>
            <div className="action-row">
              {Object.entries(flagLabels)
                .filter(([key]) => data.ingreso[key as keyof Flags])
                .map(([key, label]) => (
                  <span className="badge badge-occupied" key={key}>
                    {label}
                  </span>
                ))}
            </div>
            <h3>Diagnósticos</h3>
            <ol>
              {data.diagnosticos.map((d, i) => (
                <li key={i}>
                  {d.cie10Codigo} {d.cie10Descripcion}
                </li>
              ))}
            </ol>
            <p>{data.ingreso.notasEstancia || "Sin notas de estancia"}</p>
            {data.puedeEditar && !data.egreso && (
              <div className="action-row">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setError("");
                    setMode("edit");
                  }}
                >
                  Actualizar información
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setError("");
                    setDate(fechaLocalInput());
                    setMode("transfer");
                  }}
                >
                  <Icon name="transfer" />
                  Trasladar / cambiar cama
                </button>
                <Link
                  className="btn btn-secondary"
                  href={`/egresos/nuevo?ingresoId=${id}`}
                >
                  <Icon name="discharge" />
                  Registrar egreso
                </Link>
              </div>
            )}
          </section>
          {mode !== "view" && (
            <form className="detail-card" onSubmit={save}>
              <h2>
                {mode === "edit" ? "Actualizar estancia" : "Traslado interno"}
              </h2>
              {mode === "edit" ? (
                <>
                  <p>
                    Médico:{" "}
                    <strong>{doctor?.nombre || "Selecciona un médico"}</strong>
                  </p>
                  <ClinicalLookup
                    kind="medicos"
                    onSelect={(x) =>
                      setDoctor({
                        id: x.id,
                        nombre: [
                          x.nombres,
                          x.apellidoPaterno,
                          x.apellidoMaterno,
                        ]
                          .filter(Boolean)
                          .join(" "),
                      })
                    }
                  />
                  {Object.entries(flagLabels).map(([key, label]) => (
                    <label className="resource-toggle" key={key}>
                      <input
                        type="checkbox"
                        checked={flags[key as keyof Flags]}
                        onChange={(e) =>
                          setFlags({ ...flags, [key]: e.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <ClinicalLookup
                    kind="diagnosticos"
                    onSelect={(x) =>
                      setDiagnoses([
                        ...diagnoses,
                        {
                          cie10Codigo: x.codigo ?? null,
                          cie10Descripcion: x.descripcion ?? "",
                        },
                      ])
                    }
                  />
                  {diagnoses.map((d, i) => (
                    <div className="diagnosis-row" key={i}>
                      <label className="form-label">
                        Diagnóstico {i + 1}
                        {i === 0 ? " (principal)" : ""}
                        <input
                          className="form-input"
                          value={d.cie10Descripcion}
                          maxLength={250}
                          required
                          onChange={(e) =>
                            setDiagnoses(
                              diagnoses.map((item, j) =>
                                j === i
                                  ? {
                                      ...item,
                                      cie10Descripcion: e.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={diagnoses.length === 1}
                        onClick={() =>
                          setDiagnoses(diagnoses.filter((_, j) => j !== i))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  <label className="form-label" htmlFor="notas">
                    Notas de estancia
                  </label>
                  <textarea
                    id="notas"
                    className="form-textarea"
                    value={notes}
                    maxLength={5000}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <p>
                    Se conservarán el ingreso y la estancia acumulada. La cama
                    de origen se liberará al confirmar.
                  </p>
                  <label className="form-label" htmlFor="servicio">
                    Servicio de destino
                  </label>
                  <select
                    id="servicio"
                    className="form-select"
                    value={service}
                    required
                    onChange={(e) => {
                      setService(e.target.value);
                      setSpecialty("");
                      setBed("");
                      setSpecialties([]);
                      setBeds([]);
                    }}
                  >
                    <option value="">Seleccionar servicio</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <label className="form-label" htmlFor="especialidad">
                    Especialidad
                  </label>
                  <select
                    id="especialidad"
                    className="form-select"
                    value={specialty}
                    required
                    onChange={(e) => {
                      setSpecialty(e.target.value);
                      setBed("");
                      setBeds([]);
                    }}
                  >
                    <option value="">Seleccionar especialidad</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <label className="form-label" htmlFor="cama">
                    Cama libre de destino
                  </label>
                  <select
                    id="cama"
                    className="form-select"
                    value={bed}
                    required
                    onChange={(e) => setBed(e.target.value)}
                  >
                    <option value="">Seleccionar cama</option>
                    {beds.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.numero}
                      </option>
                    ))}
                  </select>
                  <label className="form-label" htmlFor="fecha">
                    Fecha y hora del traslado (Perú)
                  </label>
                  <input
                    className="form-input"
                    id="fecha"
                    type="datetime-local"
                    value={date}
                    max={fechaLocalInput()}
                    required
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <label className="form-label" htmlFor="motivo">
                    Motivo
                  </label>
                  <textarea
                    id="motivo"
                    className="form-textarea"
                    value={reason}
                    maxLength={1000}
                    required
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="review-summary">
                    <p>
                      <strong>Origen:</strong> {current?.servicio} / cama{" "}
                      {current?.cama}
                    </p>
                    <p>
                      <strong>Destino:</strong>{" "}
                      {services.find((s) => String(s.id) === service)?.nombre ||
                        "Pendiente"}{" "}
                      / cama{" "}
                      {beds.find((s) => String(s.id) === bed)?.numero ||
                        "Pendiente"}
                    </p>
                  </div>
                </>
              )}
              <div className="action-row">
                <button
                  className="btn btn-primary"
                  disabled={busy || (mode === "edit" && !doctor)}
                >
                  {busy
                    ? "Guardando…"
                    : mode === "edit"
                      ? "Guardar cambios"
                      : "Confirmar traslado"}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMode("view");
                    load().catch((e) => setError(e.message));
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          <section className="detail-card">
            <h2>Recorrido por servicios</h2>
            <ul className="timeline">
              {data.ubicaciones.map((u) => (
                <li key={u.id}>
                  <strong>
                    {u.servicio} · {u.especialidad} · cama {u.cama}
                  </strong>
                  <time>
                    {fechaHospital(u.desde, true)} →{" "}
                    {u.hasta ? fechaHospital(u.hasta, true) : "Actual"}
                  </time>
                  <p>
                    {diasEstancia(u.desde, u.hasta ?? new Date())} días
                    completos en esta ubicación
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <section className="detail-card">
          <h2>Historial de movimientos</h2>
          <ul className="timeline">
            {data.historial.map((h) => (
              <li key={h.id}>
                <strong>
                  {(
                    {
                      ingreso: "Ingreso",
                      egreso: "Egreso",
                      traslado: "Traslado",
                      actualizacion: "Actualización",
                      legacy: "Movimiento anterior",
                    } as Record<string, string>
                  )[h.tipo] || h.tipo}
                </strong>
                <time>{fechaHospital(h.fecha, true)}</time>
                {h.motivo && <p>{h.motivo}</p>}
                <small>
                  Registrado por {h.responsable} ·{" "}
                  {fechaHospital(h.fechaRegistro, true)}
                </small>
                {h.tipo === "actualizacion" && (
                  <details>
                    <summary>Ver cambios</summary>
                    <AuditDetails value={h.detalle} />
                  </details>
                )}
              </li>
            ))}
          </ul>
          <small>
            Fechas mostradas en hora de Perú. Los registros anteriores a esta
            versión se identifican como legacy.
          </small>
        </section>
      </div>
    </div>
  );
}
function AuditDetails({ value }: { value: string | null }) {
  let d;
  try {
    d = JSON.parse(value ?? "{}");
  } catch {
    return <p>Detalle no disponible</p>;
  }
  const changes = (Object.keys(flagLabels) as (keyof Flags)[]).filter(
    (k) => d.antes?.[k] !== d.despues?.[k],
  );
  return (
    <ul>
      {changes.map((k) => (
        <li key={k}>
          {flagLabels[k]}: {d.antes?.[k] ? "Sí" : "No"} →{" "}
          {d.despues?.[k] ? "Sí" : "No"}
        </li>
      ))}
      {d.antes?.medicoId !== d.despues?.medicoId && (
        <li>Médico responsable actualizado</li>
      )}
      {d.antes?.notasEstancia !== d.despues?.notasEstancia && (
        <li>
          Notas: {d.antes?.notasEstancia || "Sin notas"} →{" "}
          {d.despues?.notasEstancia || "Sin notas"}
        </li>
      )}
      <li>
        Diagnósticos:{" "}
        {(d.despues?.diagnosticos as Diagnosis[] | undefined)
          ?.map((x) => x.cie10Descripcion)
          .join("; ")}
      </li>
    </ul>
  );
}
