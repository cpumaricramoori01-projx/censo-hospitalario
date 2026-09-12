"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const grupos = [
  {
    titulo: null,
    items: [
      {
        label: "Panel principal",
        href: "/panel",
        icono: "▣",
      },
    ],
  },
  {
    titulo: "Movimientos",
    items: [
      {
        label: "Registrar ingreso",
        href: "/ingresos/nuevo",
        icono: "↓",
      },
      {
        label: "Registrar egreso",
        href: "/egresos/nuevo",
        icono: "↑",
      },
    ],
  },
  {
    titulo: "Hospitalización",
    items: [
      {
        label: "Estructura hospitalaria",
        href: "/test",
        icono: "▦",
      },
      {
        label: "Censo actual",
        href: "/panel",
        icono: "▤",
      },
    ],
  },
  {
    titulo: "Reportes",
    items: [
      {
        label: "Próximamente",
        href: "#",
        icono: "▥",
        disabled: true,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <Link href="/panel" className="sidebar-brand-link">
          <div className="sidebar-brand-icon">+</div>

          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">Censo Hospitalario</span>
            <span className="sidebar-brand-subtitle">Sistema de gestión</span>
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {grupos.map((grupo, grupoIndex) => (
          <div className="sidebar-group" key={grupoIndex}>
            {grupo.titulo && (
              <p className="sidebar-group-title">{grupo.titulo}</p>
            )}

            <div className="sidebar-items">
              {grupo.items.map((item) => {
                const activo =
                  !item.disabled &&
                  (pathname === item.href ||
                    (item.href !== "/panel" && pathname.startsWith(item.href)));

                if (item.disabled) {
                  return (
                    <span
                      key={item.label}
                      className="sidebar-link sidebar-link-disabled"
                    >
                      <span className="sidebar-link-icon">{item.icono}</span>
                      <span>{item.label}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`sidebar-link ${activo ? "is-active" : ""}`}
                  >
                    <span className="sidebar-link-icon">{item.icono}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-line" />
        <p>Gestión hospitalaria</p>
        <span>Hospital Regional</span>
      </div>
    </aside>
  );
}
