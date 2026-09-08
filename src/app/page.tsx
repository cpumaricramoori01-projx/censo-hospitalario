import Link from "next/link";

const funciones = [
  { numero: "01", titulo: "Gestión de ingresos", texto: "Registra hospitalizaciones y asigna la cama correspondiente." },
  { numero: "02", titulo: "Control de camas", texto: "Consulta la estructura hospitalaria y el estado de cada cama." },
  { numero: "03", titulo: "Registro de egresos", texto: "Actualiza oportunamente la salida de pacientes hospitalizados." },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="institution-placeholder" aria-label="Espacio para logo institucional">
            <span className="institution-placeholder-mark">+</span>
            <span>LOGO INSTITUCIONAL</span>
          </div>
          <p className="landing-kicker">TRANSFORMACIÓN DIGITAL EN SALUD</p>
          <h1>Censo<br /><span>Hospitalario</span></h1>
          <p className="landing-description">Plataforma para la gestión organizada de pacientes hospitalizados, camas y movimientos asistenciales.</p>
          <Link href="/panel" className="landing-cta"><span>Ingresar al sistema</span><span aria-hidden="true">→</span></Link>
          <p className="landing-note">Sistema de gestión hospitalaria · Acceso al panel operativo</p>
        </div>
        <div className="landing-visual" aria-hidden="true">
          <div className="landing-grid-pattern" />
          <div className="landing-orbit orbit-one" />
          <div className="landing-orbit orbit-two" />
          <div className="landing-center-card">
            <div className="landing-logo-placeholder"><span>+</span></div>
            <strong>CENSO</strong><small>HOSPITALARIO</small>
            <div className="landing-status-line"><span /> Sistema operativo</div>
          </div>
          <div className="landing-data-card landing-data-card-one"><span>CAMAS</span><strong>Gestión</strong><small>Disponibilidad en tiempo real</small></div>
          <div className="landing-data-card landing-data-card-two"><span>PACIENTES</span><strong>Registro</strong><small>Información centralizada</small></div>
        </div>
      </section>
      <section className="landing-features" aria-labelledby="features-title">
        <div className="landing-section-heading"><p className="page-kicker">Plataforma</p><h2 id="features-title">Una gestión hospitalaria más clara</h2><p>Herramientas diseñadas para apoyar el trabajo diario del personal de salud.</p></div>
        <div className="landing-feature-grid">{funciones.map((funcion) => <article className="landing-feature-card" key={funcion.numero}><span>{funcion.numero}</span><h3>{funcion.titulo}</h3><p>{funcion.texto}</p></article>)}</div>
      </section>
      <section className="landing-institutional"><div className="landing-secondary-logo"><span>+</span><div><strong>IDENTIDAD INSTITUCIONAL</strong><small>Espacio reservado para logotipo del hospital</small></div></div><p>Preparado para integrar la identidad visual oficial de la institución.</p></section>
    </div>
  );
}
