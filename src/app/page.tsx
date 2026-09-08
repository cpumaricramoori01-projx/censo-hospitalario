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
      "Consulta servicios, especialidades y camas, incluyendo su disponibilidad y estado actual.",
    icono: "⚙",
    color: "teal",
    href: "/test",
  },
];

export default function Home() {
  return (
    <>
      <section className="landing-intro" aria-labelledby="page-title">
        <p className="page-kicker">Sistema de gestión hospitalaria</p>

        <h1 id="page-title">Censo Hospitalario</h1>

        <p>
          Gestiona los ingresos, egresos y la disponibilidad de camas de forma
          ordenada desde un solo lugar.
        </p>
      </section>

      <section aria-labelledby="modulos-title">
        <div className="section-heading">
          <div>
            <h2 id="modulos-title">Módulos disponibles</h2>
            <p>Selecciona una opción para continuar.</p>
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
                <div className={"dashboard-card-icon " + modulo.color}>
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

          <article className="dashboard-card dashboard-card--static">
            <div className="dashboard-card-header">
              <div className="dashboard-card-icon gray">▣</div>
              <span className="card-status">Próximamente</span>
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
          Registra cada movimiento de forma oportuna para mantener actualizado
          el censo hospitalario y la disponibilidad de camas.
        </p>
      </section>
    </>
  );
}
