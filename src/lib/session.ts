import {
  createHmac,
  createHash,
  timingSafeEqual,
  scryptSync,
} from "node:crypto";
export type Role = "administrador" | "operador" | "consulta";
export type Account = {
  usuario: string;
  nombre: string;
  rol: Role;
  passwordHash: string;
};
export const COOKIE = "hegb_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export function accounts(): Account[] {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Configura SESSION_SECRET con al menos 32 caracteres");
  const data: unknown = JSON.parse(process.env.AUTH_USERS ?? "[]");
  if (!Array.isArray(data) || !data.length)
    throw new Error("Configura AUTH_USERS");
  const seen = new Set<string>();
  for (const item of data) {
    if (
      !item ||
      typeof item.usuario !== "string" ||
      !/^[a-zA-Z0-9._-]{3,64}$/.test(item.usuario) ||
      typeof item.nombre !== "string" ||
      item.nombre.length > 100 ||
      !["administrador", "operador", "consulta"].includes(item.rol) ||
      typeof item.passwordHash !== "string" ||
      !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(item.passwordHash) ||
      seen.has(item.usuario)
    )
      throw new Error("AUTH_USERS inválido");
    seen.add(item.usuario);
  }
  return data as Account[];
}
export function verifyPassword(password: string, hash: string) {
  const [, salt, key] = hash.split(":");
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(key, "hex"));
}
function revision(account: Account) {
  return createHash("sha256").update(JSON.stringify(account)).digest("hex");
}
export function signSession(account: Account, now = Date.now()) {
  accounts();
  const payload = Buffer.from(
    JSON.stringify({
      usuario: account.usuario,
      rev: revision(account),
      exp: Math.floor(now / 1000) + SESSION_SECONDS,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", process.env.SESSION_SECRET!).update(payload).digest("base64url")}`;
}
export function readSession(
  token: string | undefined,
  now = Date.now(),
): Account | null {
  if (!token || token.length > 2048) return null;
  try {
    const list = accounts();
    const [payload, signature, extra] = token.split(".");
    if (extra || !payload || !signature) return null;
    const expected = createHmac("sha256", process.env.SESSION_SECRET!)
      .update(payload)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isFinite(session.exp) || session.exp <= now / 1000) return null;
    return (
      list.find(
        (a) => a.usuario === session.usuario && revision(a) === session.rev,
      ) ?? null
    );
  } catch {
    return null;
  }
}
