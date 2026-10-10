import mysql from "mysql2/promise";
export async function connect() {
  if (!process.env.DATABASE_URL) throw new Error("Configura DATABASE_URL");
  return mysql.createConnection({
    uri: process.env.DATABASE_URL,
    timezone: "Z",
    ssl:
      process.env.DATABASE_SSL === "false"
        ? undefined
        : {
            rejectUnauthorized: true,
            ...(process.env.DATABASE_CA
              ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n") }
              : {}),
          },
  });
}
export async function checkData(db) {
  const checks = [
    [
      "Pacientes con varios ingresos activos",
      "SELECT i.hc AS referencia,COUNT(*) AS cantidad FROM ingresos i LEFT JOIN egresos e ON e.ingreso_id=i.id WHERE e.id IS NULL GROUP BY i.hc HAVING COUNT(*)>1",
    ],
    [
      "Camas con varios ingresos activos",
      "SELECT i.cama_id AS referencia,COUNT(*) AS cantidad FROM ingresos i LEFT JOIN egresos e ON e.ingreso_id=i.id WHERE e.id IS NULL GROUP BY i.cama_id HAVING COUNT(*)>1",
    ],
    [
      "Números de cama duplicados",
      "SELECT especialidad_id AS referencia,numero,COUNT(*) AS cantidad FROM camas GROUP BY especialidad_id,numero HAVING COUNT(*)>1",
    ],
    [
      "Egresos anteriores al ingreso",
      "SELECT i.id AS referencia FROM ingresos i JOIN egresos e ON e.ingreso_id=i.id WHERE e.fecha_egreso<i.fecha_ingreso",
    ],
    [
      "Ingresos sin paciente o cama",
      "SELECT i.id AS referencia FROM ingresos i LEFT JOIN pacientes_ref p ON p.hc=i.hc LEFT JOIN camas c ON c.id=i.cama_id WHERE p.hc IS NULL OR c.id IS NULL",
    ],
    [
      "Estancias históricas solapadas en una cama",
      "SELECT a.id AS referencia,b.id AS otro FROM ingresos a JOIN ingresos b ON a.cama_id=b.cama_id AND a.id<b.id LEFT JOIN egresos ea ON ea.ingreso_id=a.id LEFT JOIN egresos eb ON eb.ingreso_id=b.id WHERE a.fecha_ingreso<COALESCE(eb.fecha_egreso,'9999-12-31') AND b.fecha_ingreso<COALESCE(ea.fecha_egreso,'9999-12-31')",
    ],
  ];
  let failed = false;
  for (const [name, query] of checks) {
    const [rows] = await db.query(query);
    console.log(`${name}: ${rows.length}`);
    if (rows.length) {
      failed = true;
      console.log(
        "Referencias que requieren revisión:",
        rows.map((r) => r.referencia),
      );
    }
  }
  return !failed;
}
if (process.argv[1]?.endsWith("check-data.mjs")) {
  const db = await connect();
  try {
    if (!(await checkData(db))) process.exitCode = 1;
  } finally {
    await db.end();
  }
}
