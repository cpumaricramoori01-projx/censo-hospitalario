"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Brand from "@/app/components/Brand";
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: fields.get("usuario"),
          password: fields.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace("/panel");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="login-page">
      <div className="login-card">
        <Brand full />
        <p className="page-kicker">Acceso del personal</p>
        <h1>Bienvenido al censo</h1>
        <p>Ingresa con tu cuenta del hospital.</p>
        <form onSubmit={login}>
          <label className="form-label" htmlFor="usuario">
            Usuario
          </label>
          <input
            className="form-input"
            id="usuario"
            name="usuario"
            autoComplete="username"
            maxLength={64}
            required
          />
          <label className="form-label" htmlFor="password">
            Contraseña
          </label>
          <input
            className="form-input"
            type="password"
            id="password"
            name="password"
            autoComplete="current-password"
            maxLength={256}
            required
          />
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar al sistema"}
          </button>
        </form>
        <small>Hospital Regional Eleazar Guzmán Barrón</small>
      </div>
    </section>
  );
}
