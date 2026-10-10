import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { readSession, sessionMatchesAccount, validAccount } from "./session";
export async function findAccount(usuario: string) {
  const [account] = await db.select().from(usuarios).where(and(eq(usuarios.usuario, usuario), eq(usuarios.activo, true))).limit(1);
  return account && validAccount(account) ? account : null;
}
export async function sessionAccount(token: string | undefined) {
  const session = readSession(token);
  if (!session) return null;
  const account = await findAccount(session.usuario);
  return sessionMatchesAccount(session, account) ? account : null;
}
