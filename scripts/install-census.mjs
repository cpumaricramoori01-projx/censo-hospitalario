import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { connect } from "./check-data.mjs";
const journal = JSON.parse(
  await readFile(
    new URL("../drizzle/meta/_journal.json", import.meta.url),
    "utf8",
  ),
);
const entry = journal.entries.find((e) => e.tag.startsWith("0006_"));
if (!entry) throw Error("Falta migración 0006");
const source = await readFile(
  new URL("../drizzle/" + entry.tag + ".sql", import.meta.url),
  "utf8",
);
const hash = createHash("sha256").update(source).digest("hex");
const db = await connect();
try {
  const [done] = await db.query(
    "SELECT hash FROM __drizzle_migrations WHERE created_at=?",
    [entry.when],
  );
  if (done.length && done[0].hash !== hash)
    throw Error("La migración registrada no coincide");
  if (!done.length)
    for (const part of source.split("--> statement-breakpoint")) {
      const stmt = part.trim();
      if (stmt) {
        if (stmt.startsWith("CREATE TABLE ")) {
          await db.query(
            stmt.replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS "),
          );
          continue;
        }
        const fk = stmt.match(
          /^ALTER TABLE `(partes_censo|periodos_cama)` ADD CONSTRAINT `(\w+)` FOREIGN KEY/,
        );
        const idx = stmt.match(
          /^CREATE INDEX `(\w+)` ON `(auditoria_sistema|periodos_cama)`/,
        );
        if (!fk && !idx)
          throw Error("Migración contiene operaciones no autorizadas");
        const [existing] = fk
          ? await db.query(
              "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
              [fk[1], fk[2]],
            )
          : await db.query(
              "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?",
              [idx[2], idx[1]],
            );
        if (!existing.length) await db.query(stmt);
      }
    }
  await db.beginTransaction();
  try {
    const [now] = await db.query("SELECT UTC_TIMESTAMP() AS inicio");
    await db.query(
      "INSERT INTO configuracion_censo(id,hora_corte,alerta_estancia,inicio_capacidad) VALUES (1,'00:00',14,?) ON DUPLICATE KEY UPDATE id=id",
      [now[0].inicio],
    );
    await db.query("SELECT id FROM configuracion_censo WHERE id=1 FOR UPDATE");
    await db.query(
      "INSERT INTO periodos_cama(cama_id,servicio_id,servicio,especialidad,cama,habilitada,motivo,desde,responsable) SELECT c.id,s.id,s.nombre,e.nombre,c.numero,c.estado <> 'inoperativa','Estado verificado al iniciar el historial; no reconstruye capacidad anterior',?, 'instalacion' FROM camas c JOIN especialidades e ON e.id=c.especialidad_id JOIN servicios s ON s.id=e.servicio_id WHERE NOT EXISTS(SELECT 1 FROM periodos_cama p WHERE p.cama_id=c.id)",
      [now[0].inicio],
    );
    if (!done.length)
      await db.query(
        "INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,?)",
        [hash, entry.when],
      );
    await db.commit();
  } catch (e) {
    await db.rollback();
    throw e;
  }
  const [rows] = await db.query("SELECT COUNT(*) AS n FROM periodos_cama");
  console.log(
    "Configuración, partes y auditoría preparados. Períodos de cama:",
    rows[0].n,
  );
} finally {
  await db.end();
}
