"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Brand from "./Brand";
import Icon, { type IconName } from "./Icon";
type User = { nombre: string; rol: "administrador" | "operador" | "consulta" };
const items: {
  label: string;
  href: string;
  icon: IconName;
  role?: "write" | "admin";
}[] = [
  { label: "Panel principal", href: "/panel", icon: "dashboard" },
  { label: "Censo actual", href: "/censo", icon: "patient" },
  {
    label: "Registrar ingreso",
    href: "/ingresos/nuevo",
    icon: "admission",
    role: "write",
  },
  {
    label: "Registrar egreso",
    href: "/egresos/nuevo",
    icon: "discharge",
    role: "write",
  },
  {
    label: "Estructura hospitalaria",
    href: "/estructura",
    icon: "bed",
    role: "admin",
  },
  { label: "Reportes", href: "/reportes", icon: "report" },
];
export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (path !== "/" && path !== "/login")
      fetch("/api/auth/session", { cache: "no-store" })
        .then(async (r) => {
          if (r.ok) setUser(await r.json());
          else router.replace("/login");
        })
        .catch(() => setUser(null));
  }, [path, router]);
  if (path === "/" || path === "/login") return null;
  async function logout() {
    const r = await fetch("/api/auth/logout", { method: "POST" });
    if (r.ok) {
      router.replace("/login");
      router.refresh();
    }
  }
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <Link href="/panel" className="sidebar-brand-link">
          <Brand />
        </Link>
      </div>
      <nav className="sidebar-nav" aria-label="Navegación principal">
        <div className="sidebar-items">
          {items
            .filter(
              (i) =>
                !i.role ||
                (user &&
                  (i.role === "admin"
                    ? user.rol === "administrador"
                    : user.rol !== "consulta")),
            )
            .map((i) => (
              <Link
                href={i.href}
                key={i.href}
                className={`sidebar-link ${path === i.href || path.startsWith(i.href + "/") ? "is-active" : ""}`}
                aria-current={path === i.href ? "page" : undefined}
              >
                <Icon name={i.icon} />
                <span>{i.label}</span>
              </Link>
            ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        {user && (
          <>
            <strong>{user.nombre}</strong>
            <span>{user.rol}</span>
            <button className="sidebar-logout" onClick={logout}>
              <Icon name="logout" />
              Cerrar sesión
            </button>
          </>
        )}
        <p>
          Hospital Regional
          <br />
          Eleazar Guzmán Barrón
        </p>
      </div>
    </aside>
  );
}
