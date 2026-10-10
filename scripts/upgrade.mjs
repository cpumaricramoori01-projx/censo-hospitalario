import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { connect, checkData } from "./check-data.mjs";
// Ejecutar exclusivamente sobre una copia respaldada, con la aplicación detenida.
const db = await connect();
try {
  const journal = JSON.parse(
    await readFile(
      new URL("../drizzle/meta/_journal.json", import.meta.url),
      "utf8",
    ),
  );
  const entry = journal.entries.find(
    (e) => e.tag === "0004_hegb_hospitalizaciones",
  );
  const source = await readFile(
    new URL(`../drizzle/${entry.tag}.sql`, import.meta.url),
    "utf8",
  );
  const hash = createHash("sha256").update(source).digest("hex");
  await db.query(
    "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id serial PRIMARY KEY,hash text NOT NULL,created_at bigint)",
  );
  const [done] = await db.query(
    "SELECT hash FROM __drizzle_migrations WHERE created_at=?",
    [entry.when],
  );
  if (done.length) {
    if (done[0].hash !== hash)
      throw new Error("La migración aplicada difiere del archivo actual");
    console.log("La actualización ya fue aplicada");
  } else {
    if (!(await checkData(db)))
      throw new Error("Resuelve las inconsistencias antes de migrar");
    // Declarar explícitamente cómo se almacenaban las fechas antiguas, nunca adivinar.
    const legacy = process.env.LEGACY_TIME_ZONE;
    if (!["UTC", "America/Lima"].includes(legacy))
      throw new Error(
        "Configura LEGACY_TIME_ZONE=UTC o America/Lima después de comprobar los datos antiguos",
      );
    const [partial] = await db.query(
      "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='ingresos' AND column_name='fecha_registro'",
    );
    if (Number(partial[0].n) > 0)
      throw new Error(
        "Hay una migración parcial sin registrar. Restaura el respaldo de prueba antes de repetirla",
      );
    // Registrar todas las fechas disponibles como UTC si antes eran horas locales.
    if (legacy === "America/Lima") {
      await db.beginTransaction();
      try {
        await db.query(
          "UPDATE ingresos SET fecha_ingreso=DATE_ADD(fecha_ingreso, INTERVAL 5 HOUR)",
        );
        await db.query(
          "UPDATE egresos SET fecha_egreso=DATE_ADD(fecha_egreso, INTERVAL 5 HOUR)",
        );
        await db.query(
          "UPDATE movimientos SET fecha=DATE_ADD(fecha, INTERVAL 5 HOUR)",
        );
        await db.commit();
      } catch (e) {
        await db.rollback();
        throw e;
      }
    }
    for (const chunk of source.split("--> statement-breakpoint")) {
      const statement = chunk.trim().replace(/;+$/, "");
      if (!statement) continue;
      const column = statement.match(/^ALTER TABLE `(\w+)` ADD `(\w+)` /);
      if (column) {
        const [found] = await db.query(
          "SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?",
          [column[1], column[2]],
        );
        if (found.length) continue;
      }
      const constraint = statement.match(
        /^ALTER TABLE `(\w+)` ADD CONSTRAINT `(\w+)`/,
      );
      if (constraint) {
        const [found] = await db.query(
          "SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name=? AND constraint_name=?",
          [constraint[1], constraint[2]],
        );
        if (found.length) continue;
      }
      await db.query(statement);
    }
    await db.query(
      "INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,?)",
      [hash, entry.when],
    );
    console.log(
      "Actualización aplicada. Verifica censo, reportes y recorridos antes de habilitar usuarios.",
    );
  }
} finally {
  await db.end();
}
