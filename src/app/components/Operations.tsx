"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "./operations.module.css";
export { styles };
export const today = () =>
  new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
export function dateLabel(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const r = await fetch(
    path,
    body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "No se pudo completar la operación");
  return data;
}
export function message(e: unknown) {
  return e instanceof Error ? e.message : "No se pudo completar la operación";
}
export function useAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    api<{ rol: string }>("/api/auth/session")
      .then((u) => setAdmin(u.rol === "administrador"))
      .catch(() => setAdmin(false));
  }, []);
  return admin;
}
export function Frame({
  title,
  description,
  error,
  children,
}: {
  title: string;
  description: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className="page-heading">
        <p className="page-kicker">Censo hospitalario · HEGB</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>;
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Export({
  name,
  headers,
  rows,
}: {
  name: string;
  headers: string[];
  rows: unknown[][];
}) {
  function download() {
    const cell = (value: unknown) => {
      let s = String(value ?? "");
      if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const text =
      "\ufeff" +
      [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <span className={styles.actions}>
      <button
        className="btn btn-secondary"
        onClick={download}
        disabled={!rows.length}
      >
        Exportar CSV
      </button>
      <button className="btn btn-secondary" onClick={() => window.print()}>
        Imprimir / PDF
      </button>
    </span>
  );
}
export function PatientLink({
  id,
  children,
}: {
  id: number;
  children: ReactNode;
}) {
  return <Link href={`/hospitalizaciones/${id}`}>{children}</Link>;
}
