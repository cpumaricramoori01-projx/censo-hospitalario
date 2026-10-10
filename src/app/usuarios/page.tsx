"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
type Role = "administrador" | "operador" | "consulta";
type User = { id: number; usuario: string; nombre: string; rol: Role; activo: boolean };
const empty = { usuario: "", nombre: "", rol: "consulta" as Role, activo: true, password: "" };
export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [current, setCurrent] = useState<number>();
  const [editing, setEditing] = useState<number>();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/usuarios", { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })])
      .then(async ([list, session]) => {
        if (list.status === 401) { router.replace("/login"); return; }
        if (list.status === 403) { router.replace("/panel"); return; }
        const data = await list.json();
        if (!list.ok) throw new Error(data.error);
        const account = await session.json();
        if (active) { setUsers(data); setCurrent(account.id); }
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : "No se pudieron cargar los usuarios"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);
  function edit(user?: User) {
    setEditing(user?.id);
    setForm(user ? { usuario: user.usuario, nombre: user.nombre, rol: user.rol, activo: user.activo, password: "" } : empty);
    setError(""); setMessage("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/usuarios", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...(editing ? { id: editing } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (editing === current) { router.replace("/login"); router.refresh(); return; }
      const result = await fetch("/api/usuarios", { cache: "no-store" });
      const updated = await result.json();
      if (!result.ok) throw new Error(updated.error);
      setUsers(updated); setForm(empty); setEditing(undefined); setMessage("Usuario guardado");
    } catch(e) { setError(e instanceof Error ? e.message : "No se pudo guardar el usuario"); }
    finally { setBusy(false); }
  }
  return <div className="form-page">
    <header className="page-heading page-heading-with-action"><div><p className="page-kicker">Administración</p><h1>Usuarios</h1><p>Administra las cuentas y los permisos del personal.</p></div><Link className="page-heading-action" href="/panel">Volver al panel</Link></header>
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="status-message" role="status">{message}</p>}
    <div className="form-card"><section className="form-section"><h2 className="form-section-title">Cuentas del personal</h2>
      {loading ? <p role="status">Cargando usuarios…</p> : users.length === 0 ? <p>No hay usuarios disponibles.</p> : <div style={{ display: "grid", gap: 12 }}>{users.map(user => <div key={user.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}><div><strong>{user.nombre}</strong><p>{user.usuario} · {user.rol} · {user.activo ? "Activo" : "Inactivo"}{user.id === current ? " · Tu cuenta" : ""}</p></div><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => edit(user)}>Editar</button></div>)}</div>}
    </section></div>
    <div className="form-card"><form className="form-section" onSubmit={save}><h2 className="form-section-title">{editing ? "Editar usuario" : "Crear usuario"}</h2><div className="form-grid-2">
      <div><label className="form-label" htmlFor="account-username">Usuario</label><input className="form-input" id="account-username" value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} minLength={3} maxLength={64} pattern="[a-zA-Z0-9._\-]+" required autoComplete="off" /></div>
      <div><label className="form-label" htmlFor="account-name">Nombre</label><input className="form-input" id="account-name" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} maxLength={100} required /></div>
      <div><label className="form-label" htmlFor="account-role">Rol</label><select className="form-select" id="account-role" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value as Role })}><option value="consulta">Consulta</option><option value="operador">Operador</option><option value="administrador">Administrador</option></select></div>
      <div><label className="form-label" htmlFor="account-password">{editing ? "Nueva contraseña" : "Contraseña"}</label><input className="form-input" id="account-password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={12} maxLength={256} required={!editing} autoComplete="new-password" />{editing && <small>Déjala vacía para conservar la contraseña actual.</small>}</div>
    </div><label style={{ display: "flex", alignItems: "center", gap: 8, marginBlock: 16 }}><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />Usuario activo</label>
      <p className="form-section-description">Consulta puede ver censo y reportes. Operador también registra ingresos, traslados y egresos. Administrador gestiona además la estructura y las cuentas.</p>
      {editing === current && <p className="status-message">Al guardar cambios en tu cuenta deberás iniciar sesión de nuevo.</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button className="btn btn-primary" disabled={busy || loading}>{busy ? "Guardando…" : "Guardar usuario"}</button>{editing && <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => edit()}>Cancelar edición</button>}</div>
    </form></div>
  </div>;
}
