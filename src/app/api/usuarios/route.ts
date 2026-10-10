import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import { hashPassword, type Role } from "@/lib/session";
import { fallo, HttpError, identificador, jsonObject, texto } from "@/lib/validation";
const publicColumns = { id: usuarios.id, usuario: usuarios.usuario, nombre: usuarios.nombre, rol: usuarios.rol, activo: usuarios.activo };
function values(body: Record<string, unknown>, creating: boolean) {
  const usuario = texto(body.usuario, "Usuario", 64).toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(usuario)) throw new HttpError("Usuario: usa entre 3 y 64 letras, números, puntos, guiones o guiones bajos");
  const nombre = texto(body.nombre, "Nombre", 100);
  if (typeof body.rol !== "string" || !["administrador", "operador", "consulta"].includes(body.rol)) throw new HttpError("Rol inválido");
  if (typeof body.activo !== "boolean") throw new HttpError("Estado del usuario inválido");
  const password = body.password;
  let passwordHash: string | undefined;
  if (creating || (password !== undefined && password !== "")) {
    if (typeof password !== "string" || password.length < 12 || password.length > 256) throw new HttpError("La contraseña debe tener entre 12 y 256 caracteres");
    passwordHash = hashPassword(password);
  }
  return { usuario, nombre, rol: body.rol as Role, activo: body.activo, ...(passwordHash ? { passwordHash } : {}) };
}
export async function GET() {
  try {
    await requireUser(["administrador"]);
    return NextResponse.json(await db.select(publicColumns).from(usuarios).orderBy(asc(usuarios.usuario)), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return fallo(e); }
}
export async function POST(request: Request) {
  try {
    const actor = await requireWrite(true);
    const value = values(await jsonObject(request), true);
    const id = await db.transaction(async tx => {
      const list = await tx.select(publicColumns).from(usuarios).orderBy(asc(usuarios.id)).for("update");
      if (!list.some(u => u.id === actor.id && u.activo && u.rol === "administrador")) throw new HttpError("Tu acceso cambió. Inicia sesión de nuevo", 403);
      const result = await tx.insert(usuarios).values({ ...value, passwordHash: value.passwordHash!, creadoEn: new Date(), actualizadoEn: new Date() });
      return result[0].insertId;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) { return fallo(e); }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireWrite(true);
    const body = await jsonObject(request);
    const id = identificador(body.id);
    const value = values(body, false);
    await db.transaction(async tx => {
      // Bloquear siempre en el mismo orden evita perder al último administrador en cambios simultáneos.
      const list = await tx.select(publicColumns).from(usuarios).orderBy(asc(usuarios.id)).for("update");
      if (!list.some(u => u.id === actor.id && u.activo && u.rol === "administrador")) throw new HttpError("Tu acceso cambió. Inicia sesión de nuevo", 403);
      const account = list.find(u => u.id === id);
      if (!account) throw new HttpError("Usuario no encontrado", 404);
      if (account.activo && account.rol === "administrador" && (!value.activo || value.rol !== "administrador") && list.filter(u => u.activo && u.rol === "administrador").length === 1) throw new HttpError("Debe quedar al menos un administrador activo", 409);
      await tx.update(usuarios).set({ ...value, versionSesion: sql`${usuarios.versionSesion} + 1`, actualizadoEn: new Date() }).where(eq(usuarios.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return fallo(e); }
}
