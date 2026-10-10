import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "33306" ||
  url.pathname !== "/censo_test"
)
  throw new Error("Solo admite el MySQL temporal de prueba");
const db = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  timezone: "Z",
});
try {
  const [rows] = await db.query("SHOW TABLES");
  if (rows.length) throw new Error("La base de pruebas debe estar vacía");
  for (const file of [
    "0000_smiling_ravenous",
    "0001_cute_cassandra_nova",
    "0002_icy_rattler",
    "0003_add_notes_to_egresos",
  ]) {
    const source = await readFile(
      new URL(`../drizzle/${file}.sql`, import.meta.url),
      "utf8",
    );
    for (const part of source.split("--> statement-breakpoint"))
      if (part.trim()) await db.query(part.trim());
  }
  await db.query(
    "INSERT INTO servicios(id,nombre) VALUES (1,'Medicina'),(2,'UCI')",
  );
  await db.query(
    "INSERT INTO especialidades(id,nombre,servicio_id) VALUES (1,'Medicina Interna',1),(2,'Cuidados Intensivos',2)",
  );
  await db.query(
    "INSERT INTO camas(id,numero,especialidad_id,estado) VALUES (1,'M01',1,'libre'),(2,'M02',1,'libre'),(3,'U01',2,'libre'),(4,'U02',2,'inoperativa'),(5,'L01',1,'libre'),(6,'L02',1,'ocupada')",
  );
  await db.query(
    "INSERT INTO pacientes_ref(hc,nombres,apellido_paterno,fecha_actualizacion) VALUES ('LEGACYclosed','Paciente','Anterior','2026-08-01'),('LEGACYactive','Paciente','Activo','2026-09-01')",
  );
  await db.query(
    "INSERT INTO ingresos(id,hc,cama_id,fecha_ingreso) VALUES (1,'LEGACYclosed',5,'2026-08-05 13:00:00'),(2,'LEGACYactive',6,'2026-09-15 13:00:00')",
  );
  await db.query(
    "INSERT INTO egresos(ingreso_id,fecha_egreso,tipo_egreso) VALUES (1,'2026-08-07 13:00:00','alta_medica')",
  );
  // Simular tablas creadas manualmente antes de esta actualización.
  const source = await readFile(
    new URL("../drizzle/0004_hegb_hospitalizaciones.sql", import.meta.url),
    "utf8",
  );
  for (const chunk of source.split("--> statement-breakpoint"))
    if (/CREATE TABLE IF NOT EXISTS `(medicos|diagnosticos)`/.test(chunk))
      await db.query(chunk.trim());
  await db.query("ALTER TABLE ingresos ADD medico_id int");
  await db.query(
    "INSERT INTO medicos(id,cmp,nombres,apellido_paterno,especialidad,servicio_id) VALUES (1,'TEST001','Médico','Prueba','Medicina',1)",
  );
  await db.query(
    "INSERT INTO diagnosticos(codigo,descripcion) VALUES ('Z00','Diagnóstico de prueba')",
  );
  console.log(
    "Base anterior y datos ficticios preparados para comprobar actualización",
  );
} finally {
  await db.end();
}
