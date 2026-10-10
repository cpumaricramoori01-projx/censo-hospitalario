"use client";
import { useState, useEffect } from "react";
import {
  Frame,
  Toolbar,
  api,
  dateLabel,
  message,
  styles,
} from "@/app/components/Operations";
type Config = {
  horaCorte: string;
  alertaEstancia: number;
  inicioCapacidad: string;
  corteBloqueado: boolean;
};
export default function ConfigurationPage() {
  const [config, setConfig] = useState<Config>();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<Config>("/api/censo/configuracion")
      .then((d) => {
        if (active) setConfig(d);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function save() {
    if (!config) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api("/api/censo/configuracion", { ...config, motivo }, "PATCH");
      setConfig(await api<Config>("/api/censo/configuracion"));
      setMotivo("");
      setSuccess("Configuración guardada");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Frame
      title="Configuración del censo"
      description="Reglas operativas comunes para los partes y sus indicadores."
      error={error}
    >
      {success && (
        <p role="status" className={styles.notice}>
          {success}
        </p>
      )}
      {config && (
        <>
          <Toolbar>
            <label>
              Hora de corte · Perú
              <input
                type="time"
                value={config.horaCorte}
                disabled={config.corteBloqueado}
                onChange={(e) =>
                  setConfig({ ...config, horaCorte: e.target.value })
                }
              />
            </label>
            <label>
              Aviso de estancia desde (días)
              <input
                type="number"
                min={1}
                max={365}
                value={config.alertaEstancia}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alertaEstancia: Number(e.target.value),
                  })
                }
              />
            </label>
          </Toolbar>
          <p className={styles.notice}>
            Un período va desde el corte de la fecha elegida hasta el corte del
            día siguiente. La hora se puede cambiar antes del primer cierre;
            después queda fija para conservar la comparabilidad. El umbral de
            estancia es un aviso operativo configurable.
          </p>
          <label htmlFor="config-reason">Motivo del cambio</label>
          <textarea
            id="config-reason"
            maxLength={2000}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={busy || !motivo.trim()}
            onClick={save}
          >
            Guardar configuración
          </button>
          <p>
            Historial verificable de capacidad desde:{" "}
            <strong>{dateLabel(config.inicioCapacidad)}</strong>.
          </p>
          <p className={styles.notice}>
            Pacientes-día: pacientes presentes al cierre, más quienes ingresaron
            y egresaron dentro del mismo período. Capacidad diaria: camas
            habilitadas al cierre, con cobertura histórica del día completo. La
            permanencia estadística usa fechas de Perú, mínimo un día por
            egreso; las fichas mantienen la duración en días completos de 24
            horas.
          </p>
        </>
      )}
    </Frame>
  );
}
