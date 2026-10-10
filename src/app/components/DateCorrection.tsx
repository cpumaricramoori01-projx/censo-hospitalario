"use client";
import { useState } from "react";
import Link from "next/link";
import { fechaLocalInput } from "@/lib/hospital";
import { api, message, useAdmin, styles } from "./Operations";
export default function DateCorrection({
  id,
  fechaIngreso,
  fechaEgreso,
  ubicaciones,
}: {
  id: number;
  fechaIngreso: string;
  fechaEgreso: string | null;
  ubicaciones: { id: number; desde: string; cama: string; servicio: string }[];
}) {
  const admin = useAdmin();
  const [event, setEvent] = useState("ingreso");
  const [date, setDate] = useState(() =>
    fechaLocalInput(new Date(fechaIngreso)),
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function select(value: string) {
    setEvent(value);
    const time =
      value === "ingreso"
        ? fechaIngreso
        : value === "egreso"
          ? fechaEgreso
          : ubicaciones.find((u) => u.id === Number(value.split(":")[1]))
              ?.desde;
    if (time) setDate(fechaLocalInput(new Date(time)));
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/hospitalizaciones/${id}/correccion`, {
        tipo: event.split(":")[0],
        ubicacionId: event.includes(":")
          ? Number(event.split(":")[1])
          : undefined,
        fecha: date,
        motivo: reason,
      });
      window.location.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (!admin) return null;
  return (
    <details className={styles.details}>
      <summary>Corrección administrativa de fechas</summary>
      <p>
        Corrige una fecha registrada conservando la auditoría. Reabre
        previamente los partes cerrados afectados; no se permiten solapamientos
        ni alterar el orden del recorrido.
      </p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className={styles.toolbar}>
        <label>
          Evento
          <select value={event} onChange={(e) => select(e.target.value)}>
            <option value="ingreso">Ingreso</option>
            {ubicaciones.slice(1).map((u) => (
              <option key={u.id} value={`traslado:${u.id}`}>
                Traslado a {u.servicio} / {u.cama}
              </option>
            ))}
            {fechaEgreso && <option value="egreso">Egreso</option>}
          </select>
        </label>
        <label>
          Fecha y hora de Perú
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label htmlFor="correction-reason">Motivo de la corrección</label>
      <textarea
        id="correction-reason"
        className="form-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={2000}
      />
      <div className={styles.actions}>
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || !reason.trim() || !date}
          onClick={save}
        >
          {busy ? "Guardando…" : "Corregir y registrar auditoría"}
        </button>
        <Link href="/censo/parte">Revisar partes diarios</Link>
      </div>
    </details>
  );
}
