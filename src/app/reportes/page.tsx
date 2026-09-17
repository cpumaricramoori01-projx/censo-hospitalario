import Link from "next/link";

const reportes = [
  {
    titulo: "Censo actual",
    descripcion: "Consulta de los pacientes actualmente hospitalizados, su ubicación y recursos clínicos.",
    estado: "Disponible próximamente",
    icono: "▤",
  },
  {
    titulo: "Ingresos",
    descripcion: "Información de los ingresos hospitalarios registrados en el sistema.",
    estado: "En preparación",
    icono: "↓",
  },
  {
    titulo: "Egresos",
    descripcion: "Consulta de los egresos registrados y sus principales datos de atención.",
    estado: "En preparación",
    icono: "↑",
  },
  {
    titulo: "Ocupación de camas",
    descripcion: "Distribución de camas ocupadas, libres e inoperativas por servicio.",
    estado: "En preparación",
    icono: "▦",
  },
  {
    titulo: "Estancia hospitalaria",
    descripcion: "Consulta de días de hospitalización y estancias prolongadas.",
    estado: "En preparación",
    icono: "◷",
  },
];

export default function ReportesPage() {
  return (
    <div className="panel-page" style={{ maxWidth: 1320, margin: "0 auto" }}>
      <section className="page-heading" style={{ marginBottom: 24 }}>
        <div className="panel-page-heading">
          <div>
            <p className="page-kicker">Información hospitalaria</p>
            <h1 id="page-title">Reportes</h1>
            <p>Consulta y generación de información del censo hospitalario.</p>
          </div>
          <Link
            href="/panel"
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              color: "var(--primary-dark)",
              borderRadius: 9,
              padding: "9px 13px",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "var(--shadow-sm)",
              whiteSpace: "nowrap",
            }}
          >
            ← Panel principal
          </Link>
        </div>
      </section>

      <section aria-labelledby="reportes-title">
        <div className="section-heading" style={{ marginBottom: 12 }}>
          <div>
            <h2 id="reportes-title">Módulos de reporte</h2>
            <p>Los reportes se irán habilitando progresivamente sobre los datos reales del sistema.</p>
          </div>
        </div>

        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {reportes.map((reporte, index) => (
            <article
              key={reporte.titulo}
              className="dashboard-card"
              style={{
                padding: 17,
                opacity: index === 0 ? 1 : 0.92,
              }}
            >
              <div className="dashboard-card-header">
                <div className="dashboard-card-icon blue" style={{ width: 38, height: 38, fontSize: 17 }}>
                  {reporte.icono}
                </div>
                <span className="dashboard-card-arrow" aria-hidden="true">→</span>
              </div>
              <h2 style={{ marginTop: 13, fontSize: 15 }}>{reporte.titulo}</h2>
              <p style={{ marginTop: 6, minHeight: 48, lineHeight: 1.45 }}>{reporte.descripcion}</p>
              <div
                style={{
                  display: "inline-flex",
                  marginTop: 12,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: index === 0 ? "var(--primary-light)" : "#f3f5f6",
                  color: index === 0 ? "var(--primary-dark)" : "var(--muted)",
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                {reporte.estado}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: 22,
          padding: "14px 16px",
          background: "var(--primary-light)",
          border: "1px solid #cfe3e7",
          borderRadius: 12,
        }}
      >
        <strong style={{ display: "block", color: "var(--primary-dark)", fontSize: 12 }}>
          Próximo paso
        </strong>
        <p style={{ margin: "5px 0 0", color: "var(--muted)", fontSize: 11, lineHeight: 1.5 }}>
          El primer reporte que implementaremos será el censo actual, utilizando la información que ya consulta el panel principal.
        </p>
      </section>
    </div>
  );
}
