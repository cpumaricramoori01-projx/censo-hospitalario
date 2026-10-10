import Link from "next/link";
import Brand from "./components/Brand";
import Icon from "./components/Icon";
export default function LandingPage() {
  return (
    <div className="hegb-landing">
      <Brand full />
      <section className="hegb-hero">
        <p className="page-kicker">Hospital Regional Eleazar Guzmán Barrón</p>
        <h1>
          Un censo claro.
          <br />
          <span>Una atención organizada.</span>
        </h1>
        <p>
          Consulta la disponibilidad de camas y acompaña cada hospitalización
          desde el ingreso hasta el egreso.
        </p>
        <Link href="/login" className="btn btn-primary">
          Ingresar al sistema <Icon name="admission" />
        </Link>
      </section>
      <div className="hegb-feature-grid">
        {[
          {
            icon: "bed" as const,
            title: "Disponibilidad de camas",
            text: "Ubicación y estado por servicio y especialidad.",
          },
          {
            icon: "transfer" as const,
            title: "Continuidad de la estancia",
            text: "Ingresos, traslados e historial en una misma hospitalización.",
          },
          {
            icon: "report" as const,
            title: "Información para tu servicio",
            text: "Censo actual y reportes para apoyar la gestión diaria.",
          },
        ].map((x) => (
          <article key={x.title}>
            <Icon name={x.icon} />
            <h2>{x.title}</h2>
            <p>{x.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
