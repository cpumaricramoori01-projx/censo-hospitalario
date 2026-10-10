import { randomBytes, scryptSync } from "node:crypto";
// Leer por stdin evita guardar la contraseña en el historial de comandos.
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
if (password.length < 12 || password.length > 256)
  throw new Error("Usa una contraseña de 12 a 256 caracteres");
const salt = randomBytes(16).toString("hex");
console.log(`scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
