import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { readSession, signSession, verifyPassword, sessionSecret, sessionMatchesAccount, hashPassword } from "../src/lib/session.ts";
const salt = "0123456789abcdef0123456789abcdef";
const account = { usuario: "operador.test", nombre: "Operador de prueba", rol: "operador" as const, passwordHash: `scrypt:${salt}:${scryptSync("prueba-segura-123", salt, 64).toString("hex")}` };
function setup() { process.env.SESSION_SECRET = "test-only-session-secret-at-least-32-characters"; }
test("El acceso falla cerrado sin secreto", () => { delete process.env.SESSION_SECRET; assert.throws(() => sessionSecret()); assert.throws(() => signSession(account)); assert.equal(readSession("invalid"), null); setup(); });
test("Contraseñas se comparan con hashes válidos", () => { assert.equal(verifyPassword("prueba-segura-123", account.passwordHash), true); assert.equal(verifyPassword("incorrecta", account.passwordHash), false); assert.equal(verifyPassword("incorrecta", "hash-inválido"), false); assert.throws(() => hashPassword("corta")); });
test("Sesión válida, alterada y expirada", () => {
  setup(); const now = Date.now(); const token = signSession(account, now); const session = readSession(token, now);
  assert.equal(session?.usuario, account.usuario); assert.equal(sessionMatchesAccount(session, account), true);
  const [, signature] = token.split("."); const changed = Buffer.from(JSON.stringify({ usuario: "administrador", exp: 9999999999 })).toString("base64url");
  assert.equal(readSession(`${changed}.${signature}`, now), null); assert.equal(readSession(token, now + 8 * 3600000), null); assert.equal(readSession(`${token}.extra`, now), null);
});
test("Cambiar rol, contraseña o nombre en BD revoca la sesión", () => {
  setup(); const session = readSession(signSession(account));
  assert.equal(sessionMatchesAccount(session, { ...account, rol: "consulta" }), false);
  assert.equal(sessionMatchesAccount(session, { ...account, passwordHash: hashPassword("otra-contraseña-123") }), false);
  assert.equal(sessionMatchesAccount(session, { ...account, nombre: "Otro nombre" }), false);
  assert.equal(sessionMatchesAccount(session, null), false);
  assert.equal(sessionMatchesAccount(session, { ...account, id: 7 } as typeof account), true);
});
