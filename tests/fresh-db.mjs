import mysql from "mysql2/promise";
import { spawnSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "33306" ||
  url.pathname !== "/censo_test"
)
  throw new Error("Solo admite el MySQL temporal de prueba");
const db = await mysql.createConnection({ uri: url.toString() });
try {
  await db.query("CREATE DATABASE censo_fresh_test");
  url.pathname = "/censo_fresh_test";
  const result = spawnSync(
    process.execPath,
    ["node_modules/drizzle-kit/bin.cjs", "migrate"],
    { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "inherit" },
  );
  if (result.status !== 0)
    throw new Error("La migración completa de una base nueva falló");
  console.log("Migraciones completas en una base vacía: correctas");
} finally {
  await db.end();
}
