import Link from "next/link";

const modulos = [
  {
    titulo: "Registrar ingreso",
    descripcion:
      "Registra el ingreso de un paciente, asigna servicio, especialidad y cama, y completa la información clínica correspondiente.",
    icono: "↓",
    color: "blue",
    href: "/ingresos/nuevo",
  },
  {
    titulo: "Registrar egreso",
    descripcion:
      "Registra la salida de un paciente internado y actualiza la disponibilidad de su cama.",
    icono: "↑",
    color: "green",
    href: "/egresos/nuevo",
  },
  {
    titulo: "Estructura hospitalaria",
    descripcion:
      "Consulta los servicios, especialidades y camas registradas, incluyendo su disponibilidad y estado actual.",
    icono: "⚙",
    color: "teal",
    href: "/test",
  },
];

export default function Home() {
  return (
    <>
      <section
        className="page-heading"
        aria-labelledby="page-title"
        style={{
          padding: "clamp(28px, 5vw, 52px)",
          marginBottom: 28,
          borderRadius: 18,
          background:
            "linear-gradient(135deg, var(--primary-dark), var(--primary))",
          color: "white",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#bde8f5",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Sistema de gestión hospitalaria
        </p>

        <h1
          id="page-title"
          style={{
            maxWidth: 700,
            marginTop: 12,
            color: "white",
          }}
        >
          Censo Hospitalario
        </h1>

        <p
          style={{
            maxWidth: 650,
            marginTop: 12,
            color: "#d9edf3",
            fontSize: 16,
          }}
        >
          Gestiona de forma ordenada los ingresos, egresos y la disponibilidad
          de camas de los pacientes hospitalizados.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 24,
          }}
        >
          <Link
            href="/ingresos/nuevo"
            className="btn"
            style={{
              background: "white",
              color: "var(--primary-dark)",
            }}
          >
            Registrar ingreso
          </Link>

          <Link
            href="/test"
            className="btn"
            style={{
              border: "1px solid rgba(255,255,255,0.45)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
            }}
          >
            Ver estructura hospitalaria
          </Link>
        </div>
      </section>

      <section aria-labelledby="modulos-title">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              id="modulos-title"
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              Módulos disponibles
            </h2>
            <p
              style={{
                margin: "5px 0 0",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              Selecciona una opción para continuar.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          {modulos.map((modulo) => (
            <Link
              key={modulo.href}
              href={modulo.href}
              className="dashboard-card"
            >
              <div className="dashboard-card-header">
                <div className={`dashboard-card-icon ${modulo.color}`}>
                  {modulo.icono}
                </div>

                <span className="dashboard-card-arrow" aria-hidden="true">
                  →
                </span>
              </div>

              <h2>{modulo.titulo}</h2>
              <p>{modulo.descripcion}</p>
            </Link>
          ))}

          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon gray">▣</div>

              <span
                style={{
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: "#eef2f6",
                  color: "#536171",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Próximamente
              </span>
            </div>

            <h2>Consultas y reportes</h2>
            <p>
              Aquí se incorporarán el censo diario, reportes, estadísticas e
              indicadores hospitalarios.
            </p>
          </article>
        </div>
      </section>

      <section className="info-panel" aria-labelledby="info-title">
        <h2 id="info-title" className="info-panel-title">
          Atención institucional
        </h2>
        <p className="info-panel-text">
          Registra cada movimiento de forma oportuna para mantener actualizada
          la disponibilidad de camas y el censo hospitalario.
        </p>
      </section>
    </>
  );
}
