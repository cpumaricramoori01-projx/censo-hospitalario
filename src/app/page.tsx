import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="page-heading">
        <h1>Panel principal</h1>
        <p>
          Bienvenido al sistema de gestión del censo hospitalario.
        </p>
      </div>

      <section className="dashboard-grid">
        <Link href="/ingresos/nuevo" className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-icon blue">↓</div>
            <span className="dashboard-card-arrow">→</span>
          </div>

          <h2>Registrar ingreso</h2>

          <p>
            Registra el ingreso de un paciente, asigna servicio,
            especialidad y cama, y completa la información clínica
            correspondiente.
          </p>
        </Link>

        <Link href="/egresos/nuevo" className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-icon green">↑</div>
            <span className="dashboard-card-arrow">→</span>
          </div>

          <h2>Registrar egreso</h2>

          <p>
            Registra el egreso de un paciente internado y libera la
            cama correspondiente.
          </p>
        </Link>

     <Link href="/test" className="dashboard-card">
  <div className="dashboard-card-header">
    <div className="dashboard-card-icon teal">⚙</div>
    <span className="dashboard-card-arrow">→</span>
  </div>

  <h2>Estructura hospitalaria</h2>

  <p>
    Consulta servicios, especialidades y camas disponibles dentro
    de la estructura hospitalaria.
  </p>
</Link>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-icon gray">▣</div>
          </div>

          <h2>Módulos en desarrollo</h2>

          <p>
            Aquí podremos incorporar posteriormente consultas,
            reportes, estadísticas y otros módulos del sistema.
          </p>
        </div>
      </section>

      <section className="info-panel">
        <h3 className="info-panel-title">
          Sistema de Censo Hospitalario
        </h3>

        <p className="info-panel-text">
          Utiliza las opciones disponibles para registrar y gestionar
          los movimientos de pacientes hospitalizados.
        </p>
      </section>
    </>
  );
}