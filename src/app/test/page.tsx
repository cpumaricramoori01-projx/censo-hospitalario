"use client";

import { useEffect, useState } from "react";

type Servicio = {
  id: number;
  nombre: string;
};

type Especialidad = {
  id: number;
  nombre: string;
  servicioId: number;
};

type Cama = {
  id: number;
  numero: string;
  estado: string;
  ubicacion: string | null;
  especialidadId: number;
};

type ServicioItemProps = {
  servicio: Servicio;
  abierto: boolean;
  especialidades: Especialidad[];
  cargando: boolean;
  especialidadesAbiertas: Record<number, boolean>;
  camas: Record<number, Cama[]>;
  camasAbiertas: Record<number, boolean>;
  cargandoCamas: Record<number, boolean>;
  onToggleServicio: (servicio: Servicio) => void;
  onToggleEspecialidad: (especialidad: Especialidad) => void;
  onToggleCamas: (especialidadId: number) => void;
};

type EspecialidadItemProps = {
  especialidad: Especialidad;
  abierta: boolean;
  camas: Cama[];
  camasVisible: boolean;
  cargando: boolean;
  onToggleEspecialidad: () => void;
  onToggleCamas: () => void;
};

const estadoLabel: Record<string, string> = {
  libre: "LIBRE",
  ocupada: "OCUPADA",
  inoperativa: "INOPERATIVA",
};

function getEstadoColors(estado: string) {
  if (estado === "libre") {
    return {
      background: "var(--success-light)",
      color: "var(--success)",
      border: "#b8e2d0",
    };
  }

  if (estado === "ocupada") {
    return {
      background: "#fffaf0",
      color: "#9a6414",
      border: "#f1dba8",
    };
  }

  return {
    background: "var(--danger-light)",
    color: "var(--danger)",
    border: "#efc2c2",
  };
}

function CamaItem({ cama }: { cama: Cama }) {
  const colores = getEstadoColors(cama.estado);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 12px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "#fafbfd",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Cama {cama.numero}
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          {cama.ubicacion || "Ubicación no especificada"}
        </div>
      </div>

      <span
        style={{
          padding: "5px 9px",
          borderRadius: 999,
          background: colores.background,
          color: colores.color,
          border: `1px solid ${colores.border}`,
          fontSize: 9,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {estadoLabel[cama.estado] || cama.estado.toUpperCase()}
      </span>
    </div>
  );
}

function EspecialidadItem({
  especialidad,
  abierta,
  camas,
  camasVisible,
  cargando,
  onToggleEspecialidad,
  onToggleCamas,
}: EspecialidadItemProps) {
  const total = camas.length;

  const libres = camas.filter(
    (cama) => cama.estado === "libre"
  ).length;

  const ocupadas = camas.filter(
    (cama) => cama.estado === "ocupada"
  ).length;

  const inoperativas = camas.filter(
    (cama) => cama.estado === "inoperativa"
  ).length;

  return (
    <div
      style={{
        border: "1px solid #dce5eb",
        borderRadius: 9,
        overflow: "hidden",
        background: "white",
      }}
    >
      <button
        type="button"
        onClick={onToggleEspecialidad}
        style={{
          width: "100%",
          border: 0,
          background: abierta ? "#eef7f8" : "white",
          cursor: "pointer",
          padding: "13px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: abierta
              ? "var(--secondary)"
              : "#edf4f5",
            color: abierta
              ? "white"
              : "var(--secondary)",
            fontSize: 10,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          E
        </span>

        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 650,
            color: "var(--foreground)",
          }}
        >
          {especialidad.nombre}
        </span>

        {abierta && total > 0 && (
          <span
            style={{
              color: "var(--muted)",
              fontSize: 10,
            }}
          >
            {total} {total === 1 ? "cama" : "camas"}
          </span>
        )}

        <span
          className={`tree-icon ${abierta ? "is-open" : ""}`}
          style={{
            width: 20,
            height: 20,
            color: "var(--muted)",
            fontSize: 17,
          }}
        >
          ⌄
        </span>
      </button>

      <div
        className={`tree-panel ${abierta ? "" : "is-closed"}`}
      >
        <div className="tree-panel-inner">
          <div
            style={{
              padding: "12px 14px 14px 39px",
              background: "#fcfdfd",
              borderTop: "1px solid #e4ebef",
            }}
          >
            {cargando ? (
              <div className="status-message">
                Cargando información de camas...
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      padding: "9px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "white",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Total
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 18,
                        fontWeight: 750,
                      }}
                    >
                      {total}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "9px 10px",
                      border: "1px solid #b8e2d0",
                      borderRadius: 8,
                      background: "var(--success-light)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--success)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Libres
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 18,
                        fontWeight: 750,
                        color: "var(--success)",
                      }}
                    >
                      {libres}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "9px 10px",
                      border: "1px solid #f1dba8",
                      borderRadius: 8,
                      background: "#fffaf0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#9a6414",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Ocupadas
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 18,
                        fontWeight: 750,
                        color: "#9a6414",
                      }}
                    >
                      {ocupadas}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "9px 10px",
                      border: "1px solid #efc2c2",
                      borderRadius: 8,
                      background: "var(--danger-light)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--danger)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Inoperativas
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 18,
                        fontWeight: 750,
                        color: "var(--danger)",
                      }}
                    >
                      {inoperativas}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleCamas}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "white",
                    padding: "9px 11px",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 12,
                    fontWeight: 650,
                    color: "var(--primary-dark)",
                    textAlign: "left",
                  }}
                >
                  <span
                    className={`tree-icon ${
                      camasVisible ? "is-open" : ""
                    }`}
                    style={{
                      marginRight: 5,
                    }}
                  >
                    ⌄
                  </span>

                  {camasVisible
                    ? "Ocultar detalle de camas"
                    : `Ver detalle de camas (${total})`}
                </button>

                <div
                  className={`tree-panel ${
                    camasVisible ? "" : "is-closed"
                  }`}
                >
                  <div className="tree-panel-inner">
                    <div
                      style={{
                        display: "grid",
                        gap: 7,
                        marginTop: 9,
                      }}
                    >
                      {camas.length === 0 ? (
                        <div className="status-message">
                          No hay camas registradas para esta
                          especialidad.
                        </div>
                      ) : (
                        camas.map((cama) => (
                          <CamaItem
                            key={cama.id}
                            cama={cama}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicioItem({
  servicio,
  abierto,
  especialidades,
  cargando,
  especialidadesAbiertas,
  camas,
  camasAbiertas,
  cargandoCamas,
  onToggleServicio,
  onToggleEspecialidad,
  onToggleCamas,
}: ServicioItemProps) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 11,
        overflow: "hidden",
        background: "white",
      }}
    >
      {/* SERVICIO */}
      <button
        type="button"
        onClick={() => onToggleServicio(servicio)}
        style={{
          width: "100%",
          border: 0,
          background: abierto
            ? "var(--primary-light)"
            : "white",
          cursor: "pointer",
          padding: "15px 17px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: abierto
              ? "var(--primary)"
              : "#eef3f6",
            color: abierto
              ? "white"
              : "var(--primary)",
            fontSize: 11,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          S
        </span>

        <span
          style={{
            flex: 1,
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            {servicio.nombre}
          </span>

          <span
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            Servicio hospitalario
          </span>
        </span>

        {abierto && especialidades.length > 0 && (
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              background: "#d9edf3",
              color: "var(--primary-dark)",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {especialidades.length}{" "}
            {especialidades.length === 1
              ? "especialidad"
              : "especialidades"}
          </span>
        )}

        <span
          className={`tree-icon ${abierto ? "is-open" : ""}`}
          style={{
            width: 24,
            height: 24,
            color: "var(--muted)",
            fontSize: 18,
          }}
        >
          ⌄
        </span>
      </button>

      {/* PANEL DE ESPECIALIDADES */}
      <div
        className={`tree-panel ${
          abierto ? "" : "is-closed"
        }`}
      >
        <div className="tree-panel-inner">
          <div
            style={{
              padding: "7px 12px 14px 48px",
              background: "#fbfcfd",
              borderTop: "1px solid var(--border)",
            }}
          >
            {cargando ? (
              <div
                style={{
                  padding: "12px 4px",
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                Cargando especialidades...
              </div>
            ) : especialidades.length === 0 ? (
              <div
                className="status-message"
                style={{
                  marginTop: 8,
                }}
              >
                No hay especialidades registradas para este
                servicio.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {especialidades.map((especialidad) => (
                  <EspecialidadItem
                    key={especialidad.id}
                    especialidad={especialidad}
                    abierta={
                      !!especialidadesAbiertas[
                        especialidad.id
                      ]
                    }
                    camas={
                      camas[especialidad.id] || []
                    }
                    camasVisible={
                      !!camasAbiertas[
                        especialidad.id
                      ]
                    }
                    cargando={
                      !!cargandoCamas[
                        especialidad.id
                      ]
                    }
                    onToggleEspecialidad={() =>
                      onToggleEspecialidad(
                        especialidad
                      )
                    }
                    onToggleCamas={() =>
                      onToggleCamas(
                        especialidad.id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdministracionHospitalariaPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [especialidades, setEspecialidades] =
    useState<Record<number, Especialidad[]>>({});
  const [camas, setCamas] =
    useState<Record<number, Cama[]>>({});

  const [serviciosAbiertos, setServiciosAbiertos] =
    useState<Record<number, boolean>>({});

  const [especialidadesAbiertas, setEspecialidadesAbiertas] =
    useState<Record<number, boolean>>({});

  const [camasAbiertas, setCamasAbiertas] =
    useState<Record<number, boolean>>({});

  const [cargandoServicios, setCargandoServicios] =
    useState(true);

  const [cargandoEspecialidades, setCargandoEspecialidades] =
    useState<Record<number, boolean>>({});

  const [cargandoCamas, setCargandoCamas] =
    useState<Record<number, boolean>>({});

  const [servicioContexto, setServicioContexto] =
    useState<Servicio | null>(null);

  const [especialidadContexto, setEspecialidadContexto] =
    useState<Especialidad | null>(null);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {
    setCargandoServicios(true);

    try {
      const res = await fetch("/api/servicios");

      if (!res.ok) {
        throw new Error(
          "No se pudieron cargar los servicios"
        );
      }

      const data: Servicio[] = await res.json();
      setServicios(data);
    } catch (err) {
      setMensaje(
        `❌ ${
          err instanceof Error
            ? err.message
            : String(err)
        }`
      );
    } finally {
      setCargandoServicios(false);
    }
  }

  async function toggleServicio(
    servicio: Servicio
  ) {
    const id = servicio.id;
    const abierto = !!serviciosAbiertos[id];

    if (abierto) {
      setServiciosAbiertos((prev) => ({
        ...prev,
        [id]: false,
      }));

      if (servicioContexto?.id === id) {
        setServicioContexto(null);
        setEspecialidadContexto(null);
      }

      return;
    }

    setServiciosAbiertos((prev) => ({
      ...prev,
      [id]: true,
    }));

    setServicioContexto(servicio);
    setEspecialidadContexto(null);

    if (especialidades[id]) {
      return;
    }

    setCargandoEspecialidades((prev) => ({
      ...prev,
      [id]: true,
    }));

    try {
      const res = await fetch(
        `/api/especialidades?servicioId=${id}`
      );

      const data: Especialidad[] =
        await res.json();

      if (!res.ok) {
        throw new Error(
          "No se pudieron cargar las especialidades"
        );
      }

      setEspecialidades((prev) => ({
        ...prev,
        [id]: data,
      }));
    } catch (err) {
      setMensaje(
        `❌ ${
          err instanceof Error
            ? err.message
            : String(err)
        }`
      );

      setServiciosAbiertos((prev) => ({
        ...prev,
        [id]: false,
      }));
    } finally {
      setCargandoEspecialidades((prev) => ({
        ...prev,
        [id]: false,
      }));
    }
  }

  async function toggleEspecialidad(
    especialidad: Especialidad
  ) {
    const id = especialidad.id;
    const abierta =
      !!especialidadesAbiertas[id];

    if (abierta) {
      setEspecialidadesAbiertas(
        (prev) => ({
          ...prev,
          [id]: false,
        })
      );

      if (
        especialidadContexto?.id === id
      ) {
        setEspecialidadContexto(null);
      }

      return;
    }

    setEspecialidadesAbiertas(
      (prev) => ({
        ...prev,
        [id]: true,
      })
    );

    setEspecialidadContexto(
      especialidad
    );

    if (camas[id]) {
      return;
    }

    setCargandoCamas((prev) => ({
      ...prev,
      [id]: true,
    }));

    try {
      const res = await fetch(
        `/api/camas?especialidadId=${id}&all=true`
      );

      const data: Cama[] =
        await res.json();

      if (!res.ok) {
        throw new Error(
          "No se pudieron cargar las camas"
        );
      }

      setCamas((prev) => ({
        ...prev,
        [id]: data,
      }));
    } catch (err) {
      setMensaje(
        `❌ ${
          err instanceof Error
            ? err.message
            : String(err)
        }`
      );

      setEspecialidadesAbiertas(
        (prev) => ({
          ...prev,
          [id]: false,
        })
      );
    } finally {
      setCargandoCamas((prev) => ({
        ...prev,
        [id]: false,
      }));
    }
  }

  function toggleCamas(
    especialidadId: number
  ) {
    setCamasAbiertas((prev) => ({
      ...prev,
      [especialidadId]:
        !prev[especialidadId],
    }));
  }

  function irAInicio() {
    setServicioContexto(null);
    setEspecialidadContexto(null);
  }

  function irAAdministracion() {
    setEspecialidadContexto(null);
  }

  function irAServicio() {
    setEspecialidadContexto(null);
  }

  const totalEspecialidades = Object.values(
    especialidades
  ).reduce(
    (total, lista) =>
      total + lista.length,
    0
  );

  const todasLasCamas =
    Object.values(camas).flat();

  const totalCamas =
    todasLasCamas.length;

  const totalCamasLibres =
    todasLasCamas.filter(
      (cama) =>
        cama.estado === "libre"
    ).length;

  return (
    <div className="form-page">
      {/* =====================================================
          CABECERA
          ===================================================== */}

      <div className="page-heading">
        <h1>Administración hospitalaria</h1>

        <p>
          Gestiona y consulta la estructura operativa del
          sistema: servicios, especialidades y camas.
        </p>
      </div>

      {/* =====================================================
          BREADCRUMB
          ===================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 7,
          marginBottom: 18,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <button
          type="button"
          onClick={irAInicio}
          style={{
            border: 0,
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            font: "inherit",
            color: "var(--primary)",
            fontWeight: 700,
          }}
        >
          Inicio
        </button>

        <span>›</span>

        <button
          type="button"
          onClick={irAAdministracion}
          style={{
            border: 0,
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            font: "inherit",
            color: servicioContexto
              ? "var(--primary)"
              : "var(--foreground)",
            fontWeight: 600,
          }}
        >
          Administración
        </button>

        {servicioContexto && (
          <>
            <span>›</span>

            <button
              type="button"
              onClick={irAServicio}
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
                color:
                  especialidadContexto
                    ? "var(--primary)"
                    : "var(--foreground)",
                fontWeight: 600,
              }}
            >
              {servicioContexto.nombre}
            </button>
          </>
        )}

        {especialidadContexto && (
          <>
            <span>›</span>

            <span
              style={{
                color: "var(--foreground)",
                fontWeight: 600,
              }}
            >
              {especialidadContexto.nombre}
            </span>
          </>
        )}
      </div>

      {/* =====================================================
          CONTEXTO
          ===================================================== */}

      {servicioContexto && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
            padding: "11px 14px",
            borderRadius: 9,
            background: "var(--primary-light)",
            border: "1px solid #cce4ec",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--primary)",
              color: "white",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {especialidadContexto
              ? "E"
              : "S"}
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--primary-dark)",
              }}
            >
              Explorando
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--primary-dark)",
              }}
            >
              {servicioContexto.nombre}

              {especialidadContexto &&
                ` · ${especialidadContexto.nombre}`}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          RESUMEN
          ===================================================== */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div className="dashboard-card">
          <div className="dashboard-card-icon blue">
            S
          </div>

          <h2
            style={{
              marginTop: 14,
              fontSize: 16,
            }}
          >
            Servicios
          </h2>

          <p
            style={{
              marginTop: 5,
              fontSize: 27,
              fontWeight: 750,
              color: "var(--primary)",
            }}
          >
            {cargandoServicios
              ? "…"
              : servicios.length}
          </p>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon teal">
            E
          </div>

          <h2
            style={{
              marginTop: 14,
              fontSize: 16,
            }}
          >
            Especialidades cargadas
          </h2>

          <p
            style={{
              marginTop: 5,
              fontSize: 27,
              fontWeight: 750,
              color: "var(--secondary)",
            }}
          >
            {totalEspecialidades || "—"}
          </p>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon green">
            C
          </div>

          <h2
            style={{
              marginTop: 14,
              fontSize: 16,
            }}
          >
            Camas cargadas
          </h2>

          <p
            style={{
              marginTop: 5,
              fontSize: 27,
              fontWeight: 750,
              color: "var(--success)",
            }}
          >
            {totalCamas || "—"}
          </p>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon green">
            ✓
          </div>

          <h2
            style={{
              marginTop: 14,
              fontSize: 16,
            }}
          >
            Camas libres
          </h2>

          <p
            style={{
              marginTop: 5,
              fontSize: 27,
              fontWeight: 750,
              color: "var(--success)",
            }}
          >
            {totalCamasLibres || "—"}
          </p>
        </div>
      </section>

      {/* =====================================================
          ESTRUCTURA
          ===================================================== */}

      <div className="form-card">
        <section className="form-section">
          <div className="form-section-title">
            Estructura hospitalaria
          </div>

          <p className="form-section-description">
            Explora la estructura de forma jerárquica. Puedes
            mantener abiertos varios servicios y especialidades
            simultáneamente.
          </p>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 18,
            }}
          >
            {cargandoServicios ? (
              <div className="status-message">
                Cargando servicios...
              </div>
            ) : servicios.length === 0 ? (
              <div
                className="status-message"
                style={{
                  background: "var(--warning-light)",
                  borderColor: "#f3d69a",
                }}
              >
                No existen servicios registrados.
              </div>
            ) : (
              servicios.map((servicio) => (
                <ServicioItem
                  key={servicio.id}
                  servicio={servicio}
                  abierto={
                    !!serviciosAbiertos[
                      servicio.id
                    ]
                  }
                  especialidades={
                    especialidades[
                      servicio.id
                    ] || []
                  }
                  cargando={
                    !!cargandoEspecialidades[
                      servicio.id
                    ]
                  }
                  especialidadesAbiertas={
                    especialidadesAbiertas
                  }
                  camas={camas}
                  camasAbiertas={camasAbiertas}
                  cargandoCamas={cargandoCamas}
                  onToggleServicio={
                    toggleServicio
                  }
                  onToggleEspecialidad={
                    toggleEspecialidad
                  }
                  onToggleCamas={toggleCamas}
                />
              ))
            )}
          </div>
        </section>

        {mensaje && (
          <div
            className="status-message"
            style={{
              marginTop: 18,
              background: "var(--danger-light)",
              borderColor: "#efc2c2",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>{mensaje}</span>

            <button
              type="button"
              onClick={() => setMensaje(null)}
              className="btn btn-secondary"
              style={{
                minHeight: 32,
                padding: "5px 10px",
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}