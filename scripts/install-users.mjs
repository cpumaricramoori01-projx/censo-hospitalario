import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { connect } from "./check-data.mjs";
import { validAccount } from "../src/lib/session.ts";
// AUTH_USERS se admite únicamente para importar una vez los hashes anteriores.
let input = process.env.AUTH_USERS;
if (process.argv.includes("--stdin")) {
  input = "";
  for await (const chunk of process.stdin) input += chunk;
}
const seeds = input ? JSON.parse(input) : [];
if (!Array.isArray(seeds) || seeds.some(account => !validAccount(account))) throw new Error("Cuentas iniciales inválidas");
const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
const entry = journal.entries.find(e => e.tag.startsWith("0005_"));
const source = await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), "utf8");
const hash = createHash("sha256").update(source).digest("hex");
const db = await connect();
try {
  const [table] = await db.query("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='usuarios'");
  if (!table.length && !seeds.some(u => u.rol === "administrador")) throw new Error("Indica al menos un administrador para crear el acceso inicial");
  const [done] = await db.query("SELECT hash FROM __drizzle_migrations WHERE created_at=?", [entry.when]);
  if (done.length && done[0].hash !== hash) throw new Error("La migración de usuarios registrada difiere del archivo");
  if (!table.length) await db.query(source.trim().replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS "));
  await db.beginTransaction();
  try {
    for (const account of seeds) await db.query("INSERT INTO usuarios (usuario,nombre,rol,password_hash,activo,creado_en,actualizado_en) VALUES (?,?,?,?,true,UTC_TIMESTAMP(),UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE usuario=usuario", [account.usuario.toLowerCase(), account.nombre, account.rol, account.passwordHash]);
    const [admins] = await db.query("SELECT COUNT(*) AS n FROM usuarios WHERE activo=true AND rol='administrador'");
    if (!Number(admins[0].n)) throw new Error("Debe quedar al menos un administrador activo");
    if (!done.length) await db.query("INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,?)", [hash, entry.when]);
    await db.commit();
  } catch(e) { await db.rollback(); throw e; }
  const [count] = await db.query("SELECT COUNT(*) AS n FROM usuarios");
  console.log(`Tabla de usuarios preparada: ${count[0].n} cuentas. Los hashes existentes se conservan.`);
} finally { await db.end(); }
