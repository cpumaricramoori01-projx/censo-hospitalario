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
  useAdmin,
} from "@/app/components/Operations";
type Bed = {
  id: number;
  numero: string;
  ubicacion: string | null;
  especialidadId: number;
  especialidad: string;
  servicio: string;
  estado: string;
  ingresoId: number | null;
};
type Period = {
  id: number;
  cama: string;
  servicio: string;
  especialidad: string;
  habilitada: boolean;
  desde: string;
  hasta: string | null;
  motivo: string;
  responsable: string;
};
export default function BedsPage() {
  const admin = useAdmin();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selected, setSelected] = useState<Bed>();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [filter, setFilter] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<Bed[]>("/api/censo/camas")
      .then((d) => {
        if (active) setBeds(d);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function choose(bed: Bed) {
    setBusy(true);
    setError("");
    try {
      setSelected(bed);
      setPeriods(await api<Period[]>(`/api/censo/camas?camaId=${bed.id}`));
      setReason("");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function change() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api(
        "/api/camas",
        {
          ...selected,
          estado: selected.estado === "inoperativa" ? "libre" : "inoperativa",
          motivo: reason,
        },
        "PATCH",
      );
      const updated = await api<Bed[]>("/api/censo/camas");
      setBeds(updated);
      await choose(updated.find((b) => b.id === selected.id)!);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const list = beds.filter((b) =>
    [b.servicio, b.especialidad, b.numero, b.estado]
      .join(" ")
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <Frame
      title="Historial de camas"
      description="Capacidad disponible y períodos de habilitación o bloqueo, sin alterar la ocupación de pacientes."
      error={error}
    >
      <Toolbar>
        <label>
          Buscar
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Servicio, cama o estado"
          />
        </label>
      </Toolbar>
      <p className={styles.notice}>
        La cama ocupada se libera mediante traslado o egreso. Habilitar o
        bloquear una cama registra su capacidad desde la fecha y hora actuales;
        no reconstruye estados anteriores al inicio del historial.
      </p>
      <Table
        headers={["Servicio", "Especialidad", "Cama", "Estado", "Historial"]}
      >
        {list.map((b) => (
          <tr key={b.id}>
            <td>{b.servicio}</td>
            <td>{b.especialidad}</td>
            <td>{b.numero}</td>
            <td>{b.ingresoId ? "ocupada" : b.estado}</td>
            <td>
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => choose(b)}
              >
                Ver períodos
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {selected && (
        <section className={styles.details}>
          <h2>
            Cama {selected.numero} · {selected.servicio}
          </h2>
          {admin && (
            <>
              <label htmlFor="capacity-reason">
                Motivo para{" "}
                {selected.estado === "inoperativa" ? "habilitar" : "bloquear"}
              </label>
              <textarea
                id="capacity-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
              />
              <button
                className="btn btn-primary"
                disabled={busy || Boolean(selected.ingresoId) || !reason.trim()}
                onClick={change}
              >
                {selected.estado === "inoperativa"
                  ? "Habilitar cama"
                  : "Bloquear cama"}
              </button>
              {selected.ingresoId && (
                <small>Primero traslada o egresa al paciente.</small>
              )}
            </>
          )}
          <Table
            headers={[
              "Desde",
              "Hasta",
              "Estado operativo",
              "Servicio / especialidad",
              "Motivo",
              "Responsable",
            ]}
          >
            {periods.map((p) => (
              <tr key={p.id}>
                <td>{dateLabel(p.desde)}</td>
                <td>{p.hasta ? dateLabel(p.hasta) : "Actual"}</td>
                <td>{p.habilitada ? "Habilitada" : "Bloqueada"}</td>
                <td>
                  {p.servicio} / {p.especialidad}
                </td>
                <td>{p.motivo}</td>
                <td>{p.responsable}</td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </Frame>
  );
}
