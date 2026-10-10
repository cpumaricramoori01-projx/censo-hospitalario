import { cookies, headers } from "next/headers";
import { COOKIE, type Role } from "./session";
import { sessionAccount } from "./accounts";
import { HttpError } from "./validation";
export async function requireUser(
  roles: Role[] = ["administrador", "operador", "consulta"],
) {
  const account = await sessionAccount((await cookies()).get(COOKIE)?.value);
  if (!account) throw new HttpError("Inicia sesión para continuar", 401);
  if (!roles.includes(account.rol))
    throw new HttpError("Tu cuenta no tiene permiso para esta operación", 403);
  return { id: account.id, usuario: account.usuario, nombre: account.nombre, rol: account.rol };
}
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host || new URL(origin).host !== host)
    throw new HttpError("Origen de solicitud no permitido", 403);
}
export async function requireWrite(admin = false) {
  await sameOrigin();
  return requireUser(admin ? ["administrador"] : ["administrador", "operador"]);
}
