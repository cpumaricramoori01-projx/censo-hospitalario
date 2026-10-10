import { createHmac, createHash, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";
export type Role = "administrador" | "operador" | "consulta";
export type Account = { usuario: string; nombre: string; rol: Role; passwordHash: string; versionSesion?: number };
export type Session = { usuario: string; rev: string; exp: number };
export const COOKIE = "hegb_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configura SESSION_SECRET con al menos 32 caracteres");
  return secret;
}
export function validAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false;
  const item = value as Account;
  return typeof item.usuario === "string" && /^[a-zA-Z0-9._-]{3,64}$/.test(item.usuario) &&
    typeof item.nombre === "string" && item.nombre.length > 0 && item.nombre.length <= 100 &&
    ["administrador", "operador", "consulta"].includes(item.rol) &&
    typeof item.passwordHash === "string" && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(item.passwordHash);
}
export function hashPassword(password: string) {
  if (password.length < 12 || password.length > 256) throw new Error("Usa una contraseña de 12 a 256 caracteres");
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) return false;
  const [, salt, key] = hash.split(":");
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(key, "hex"));
}
export function accountRevision(account: Account) {
  const { usuario, nombre, rol, passwordHash } = account;
  return createHash("sha256").update(JSON.stringify({ usuario, nombre, rol, passwordHash, versionSesion: account.versionSesion ?? 1 })).digest("hex");
}
export function signSession(account: Account, now = Date.now()) {
  if (!validAccount(account)) throw new Error("Cuenta inválida");
  const payload = Buffer.from(JSON.stringify({ usuario: account.usuario, rev: accountRevision(account), exp: Math.floor(now / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${payload}.${createHmac("sha256", sessionSecret()).update(payload).digest("base64url")}`;
}
export function readSession(token: string | undefined, now = Date.now()): Session | null {
  if (!token || token.length > 2048) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (extra || !payload || !signature) return null;
    const expected = createHmac("sha256", sessionSecret()).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const session: Session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isFinite(session.exp) || session.exp <= now / 1000 ||
      typeof session.usuario !== "string" || !/^[a-zA-Z0-9._-]{3,64}$/.test(session.usuario) ||
      typeof session.rev !== "string" || !/^[a-f0-9]{64}$/.test(session.rev)) return null;
    return session;
  } catch { return null; }
}
export function sessionMatchesAccount(session: Session | null, account: Account | null) {
  return !!session && !!account && validAccount(account) && session.usuario === account.usuario && session.rev === accountRevision(account);
}
