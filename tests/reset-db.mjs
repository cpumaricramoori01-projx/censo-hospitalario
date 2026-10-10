import mysql from "mysql2/promise";
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "33306" ||
  url.pathname !== "/censo_test" ||
  !process.argv.includes("--reset")
)
  throw new Error(
    "Solo permite reiniciar censo_test local con --reset explícito",
  );
url.pathname = "/";
const db = await mysql.createConnection({ uri: url.toString() });
try {
  await db.query("DROP DATABASE censo_test");
  await db.query("CREATE DATABASE censo_test");
  console.log("Base local de pruebas reiniciada");
} finally {
  await db.end();
}
