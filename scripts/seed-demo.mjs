import { connect } from "./check-data.mjs";
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/censo_test"
)
  throw new Error("El seed solo admite la base local censo_test");
const db = await connect();
try {
  await db.query(
    "INSERT INTO servicios(id,nombre) VALUES (1,'Medicina'),(2,'UCI') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
  );
  await db.query(
    "INSERT INTO especialidades(id,nombre,servicio_id) VALUES (1,'Medicina Interna',1),(2,'Cuidados Intensivos',2) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
  );
  await db.query(
    "INSERT INTO camas(id,numero,especialidad_id,estado) VALUES (1,'M01',1,'libre'),(2,'M02',1,'libre'),(3,'U01',2,'libre'),(4,'U02',2,'inoperativa') ON DUPLICATE KEY UPDATE numero=VALUES(numero)",
  );
  await db.query(
    "INSERT INTO medicos(id,cmp,nombres,apellido_paterno,especialidad,servicio_id) VALUES (1,'TEST001','Médico','Prueba','Medicina',1) ON DUPLICATE KEY UPDATE nombres=VALUES(nombres)",
  );
  await db.query(
    "INSERT INTO diagnosticos(codigo,descripcion) VALUES ('Z00','Diagnóstico de prueba') ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion)",
  );
  console.log(
    "Catálogos de prueba preparados; no se crean hospitalizaciones por fuera del API",
  );
} finally {
  await db.end();
}
