import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import {
  accounts,
  readSession,
  signSession,
  verifyPassword,
} from "../src/lib/session.ts";
const salt = "0123456789abcdef0123456789abcdef";
const account = {
  usuario: "operador.test",
  nombre: "Operador de prueba",
  rol: "operador" as const,
  passwordHash: `scrypt:${salt}:${scryptSync("prueba-segura-123", salt, 64).toString("hex")}`,
};
function setup() {
  process.env.SESSION_SECRET =
    "test-only-session-secret-at-least-32-characters";
  process.env.AUTH_USERS = JSON.stringify([account]);
}
test("El acceso falla cerrado sin cuentas o secreto", () => {
  delete process.env.SESSION_SECRET;
  assert.throws(() => accounts());
  assert.equal(readSession("invalid"), null);
  setup();
});
test("Contraseñas se comparan con el hash, nunca con texto plano", () => {
  assert.equal(verifyPassword("prueba-segura-123", account.passwordHash), true);
  assert.equal(verifyPassword("incorrecta", account.passwordHash), false);
});
test("Sesión válida, alterada y expirada", () => {
  setup();
  const now = Date.now();
  const token = signSession(account, now);
  assert.equal(readSession(token, now)?.usuario, account.usuario);
  const [payload, sig] = token.split(".");
  const changed = Buffer.from(
    JSON.stringify({ usuario: "administrador", exp: 9999999999 }),
  ).toString("base64url");
  assert.equal(readSession(`${changed}.${sig}`, now), null);
  assert.equal(readSession(token, now + 8 * 3600000), null);
  assert.equal(readSession(`${payload}.${sig}.extra`, now), null);
});
test("Cambiar el rol o retirar la cuenta revoca sesiones existentes", () => {
  setup();
  const token = signSession(account);
  process.env.AUTH_USERS = JSON.stringify([{ ...account, rol: "consulta" }]);
  assert.equal(readSession(token), null);
  process.env.AUTH_USERS = "[]";
  assert.equal(readSession(token), null);
  setup();
});
