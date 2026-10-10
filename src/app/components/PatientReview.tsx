"use client";
import { useState } from "react";
import { api, message, useAdmin, styles } from "./Operations";
export default function PatientReview({
  id,
  fechaNacimiento,
  financiamiento,
}: {
  id: number;
  fechaNacimiento: string | null;
  financiamiento: string | null;
}) {
  const admin = useAdmin();
  const [birth, setBirth] = useState(fechaNacimiento?.slice(0, 10) ?? "");
  const [finance, setFinance] = useState(financiamiento ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/hospitalizaciones/${id}/revision`,
        { fechaNacimiento: birth, financiamiento: finance, motivo: reason },
        "PATCH",
      );
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
      <summary>Completar datos administrativos</summary>
      <p>
        Los cambios de nacimiento actualizan la referencia del paciente; el
        financiamiento corresponde a esta hospitalización.
      </p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className={styles.toolbar}>
        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
        </label>
        <label>
          Financiamiento
          <input
            value={finance}
            maxLength={40}
            onChange={(e) => setFinance(e.target.value)}
          />
        </label>
      </div>
      <label htmlFor="patient-review-reason">Motivo del cambio</label>
      <textarea
        id="patient-review-reason"
        value={reason}
        maxLength={2000}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        className="btn btn-primary"
        disabled={busy || !finance.trim() || !reason.trim()}
        onClick={save}
      >
        Guardar datos y auditoría
      </button>
    </details>
  );
}
