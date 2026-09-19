import { db } from "../src/db";

const DRY_RUN = process.argv.includes("--dry-run");

type Row = Record<string, any>;

const NOMBRES = [
  "Luis Alberto", "Maria Elena", "Jose Carlos", "Ana Lucia",
  "Pedro Antonio", "Rosa Isabel", "Miguel Angel", "Carmen Julia",
  "Jorge Luis", "Patricia Elena", "Carlos Eduardo", "Diana Marisol",
  "Fernando Jose", "Laura Beatriz", "Ricardo Manuel", "Sofia Andrea",
  "Juan Carlos", "Claudia Isabel", "Victor Hugo", "Teresa Milagros",
  "Marco Antonio", "Silvia Elena", "Diego Alejandro", "Natalia Fernanda",
  "Oscar Daniel", "Gabriela Rosa", "Andres Felipe", "Monica Beatriz",
  "Raul Enrique", "Valeria Isabel",
];

const APELLIDOS = [
  ["Garcia", "Torres"], ["Flores", "Mendoza"], ["Rodriguez", "Castillo"],
  ["Vargas", "Salazar"], ["Ramos", "Paredes"], ["Quispe", "Huaman"],
  ["Sanchez", "Rojas"], ["Morales", "Navarro"], ["Mendoza", "Silva"],
  ["Torres", "Vega"], ["Castillo", "Fernandez"], ["Paredes", "Guzman"],
  ["Ramirez", "Cabrera"], ["Valdez", "Espinoza"], ["Herrera", "Mori"],
];

const FINANCIAMIENTOS = [
  "SIS Gratuito",
  "SIS Independiente",
  "EsSalud",
  "Particular",
];

const TIPOS_EGRESO = [
  "alta_medica",
  "alta_voluntaria",
  "transferencia",
  "fallecimiento",
];

const FECHAS = [
  "2026-07-08 08:15:00",
  "2026-07-12 10:30:00",
  "2026-07-18 14:20:00",
  "2026-07-25 09:45:00",
  "2026-08-02 11:10:00",
  "2026-08-07 16:30:00",
  "2026-08-14 07:50:00",
  "2026-08-20 13:40:00",
  "2026-08-27 15:25:00",
  "2026-09-01 08:35:00",
  "2026-09-04 12:15:00",
  "2026-09-07 17:10:00",
  "2026-09-09 09:20:00",
  "2026-09-11 14:45:00",
  "2026-09-13 10:05:00",
  "2026-09-15 08:50:00",
];

const DIAGNOSTICOS_POR_ESPECIALIDAD: Record<string, string[]> = {
  "Medicina Interna": ["I10X", "J189", "E119"],
  "Cardiología": ["I10X", "I251", "I509"],
  "Neurología": ["G409", "G439", "I639"],
  "Gastroenterología": ["K297", "K219", "K802"],
  "Reumatología": ["M069", "M199", "M179"],
  "Neumología": ["J441", "J189", "J459"],
  "Casos Extendidos": ["R509", "R101", "R53X"],
  "Cirugía General": ["K358", "K409", "K802"],
  "Traumatología": ["S829", "S720", "M179"],
  "Urología": ["N200", "N40X", "N390"],
  "OTRL": ["H669", "J029", "H811"],
  "Cirugía Oncológica": ["C189", "C509", "C349"],
  "Cirugía Plástica": ["L984", "T813", "Z428"],
  "Neurocirugía": ["S069", "G935", "M511"],
  "Pediatría General": ["J069", "J219", "K591"],
  "Ginecología": ["N832", "N920", "N809"],
  "Obstetricia": ["O151", "O149", "O600"],
  "Psiquiatría General": ["F329", "F419", "F209"],
  "UCI General": ["J960", "A419", "R572"],
  "UCIN": ["P073", "P220", "P369"],
};

function esc(value: string | null | undefined) {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function fechaEgreso(fecha: string, dias: number) {
  const d = new Date(fecha.replace(" ", "T") + "-05:00");
  d.setDate(d.getDate() + dias);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

async function main() {
  console.log(DRY_RUN ? "\n=== SEED DEMO: DRY RUN ===\n" : "\n=== SEED DEMO: INSERCIÓN ===\n");

  const [servicios] = await db.execute(
    "SELECT id,nombre FROM servicios ORDER BY id"
  ) as any;

  const [especialidades] = await db.execute(
    `SELECT esp.id,esp.nombre,esp.servicio_id,s.nombre AS servicio
     FROM especialidades esp
     JOIN servicios s ON s.id=esp.servicio_id
     ORDER BY esp.id`
  ) as any;

  const [medicos] = await db.execute(
    `SELECT id,nombres,apellido_paterno,apellido_materno,especialidad,servicio_id
     FROM medicos
     WHERE activo=1
     ORDER BY id`
  ) as any;

  const [camas] = await db.execute(
    `SELECT c.id,c.numero,c.estado,c.especialidad_id,
            esp.nombre AS especialidad,esp.servicio_id,s.nombre AS servicio
     FROM camas c
     JOIN especialidades esp ON esp.id=c.especialidad_id
     JOIN servicios s ON s.id=esp.servicio_id
     WHERE NOT EXISTS (
       SELECT 1
       FROM ingresos i
       LEFT JOIN egresos e ON e.ingreso_id=i.id
       WHERE i.cama_id=c.id AND e.id IS NULL
     )
     ORDER BY c.id`
  ) as any;

  const [diagDisponibles] = await db.execute(
    `SELECT codigo,descripcion
     FROM diagnosticos
     WHERE activo=1
     ORDER BY id`
  ) as any;

  if (!servicios.length || !especialidades.length || !medicos.length || !camas.length) {
    throw new Error("No se pudo obtener la información maestra necesaria.");
  }

  console.log(`Servicios disponibles: ${servicios.length}`);
  console.log(`Especialidades disponibles: ${especialidades.length}`);
  console.log(`Médicos activos: ${medicos.length}`);
  console.log(`Camas libres disponibles: ${camas.length}`);
  console.log(`Diagnósticos disponibles: ${diagDisponibles.length}`);

  const ficticios: any[] = [];
  const ingresosPlan: any[] = [];

  for (let i = 0; i < 30; i++) {
    const hc = `DEMO${String(260000 + i).padStart(6, "0")}`;
    const [ap1, ap2] = APELLIDOS[i % APELLIDOS.length];

    ficticios.push({
      hc,
      nombres: NOMBRES[i],
      apellidoPaterno: ap1,
      apellidoMaterno: ap2,
      dni: String(70000000 + i),
      sexo: i % 2 === 0 ? "M" : "F",
      fechaNacimiento: `${1980 + (i % 35)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    });
  }

  const especialidadesOrdenadas = [...especialidades];

  const camasAsignadas = new Set<number>();

  for (let i = 0; i < 36; i++) {
    const esp = especialidadesOrdenadas[i % especialidadesOrdenadas.length];

    const camasEspecialidad = camas.filter(
      (c: Row) => c.especialidad_id === esp.id
    );

    const camasDisponibles = camasEspecialidad.filter(
      (c: Row) => !camasAsignadas.has(c.id)
    );

    const cama =
      camasDisponibles[i % Math.max(camasDisponibles.length, 1)] ||
      camasEspecialidad[0];

    if (cama) {
      camasAsignadas.add(cama.id);
    }

    const candidatos = medicos.filter(
      (m: Row) => m.servicio_id === esp.servicio_id
    );

    const medico =
      candidatos.find(
        (m: Row) =>
          m.especialidad?.toLowerCase() === esp.nombre?.toLowerCase()
      ) ||
      candidatos[i % candidatos.length] ||
      medicos[i % medicos.length];

    const paciente = ficticios[i % ficticios.length];
    const fecha = FECHAS[i % FECHAS.length];

    ingresosPlan.push({
      paciente,
      esp,
      cama,
      medico,
      fecha,
      financiamiento: FINANCIAMIENTOS[i % FINANCIAMIENTOS.length],
      tipoIngreso: i % 7 === 0 ? "transferencia" : "normal",
      oxigeno:
        esp.nombre === "UCI General" ||
        esp.nombre === "UCIN" ||
        i % 9 === 0
          ? 1
          : 0,
      ventilador:
        esp.nombre === "UCI General" && i % 2 === 0 ? 1 : 0,
      social: i % 8 === 0 ? 1 : 0,
      judicial: i % 13 === 0 ? 1 : 0,
    });
  }

  console.log(`\nPacientes ficticios a generar: ${ficticios.length}`);
  console.log(`Ingresos ficticios planificados: ${ingresosPlan.length}`);

  if (DRY_RUN) {
    console.log("\nDistribución por servicio:");
    const distribucion = new Map<string, number>();

    for (const x of ingresosPlan) {
      distribucion.set(
        x.esp.servicio,
        (distribucion.get(x.esp.servicio) || 0) + 1
      );
    }

    for (const [servicio, cantidad] of distribucion) {
      console.log(`  ${servicio}: ${cantidad} ingresos`);
    }

    console.log("\nEjemplos:");
    for (const x of ingresosPlan.slice(0, 8)) {
      console.log(
        `  ${x.paciente.hc} | ${x.esp.servicio} | ${x.esp.nombre} | cama ${x.cama.numero} | ${x.medico.nombres} ${x.medico.apellido_paterno}`
      );
    }

    console.log("\nDRY RUN terminado. No se modificó la base de datos.\n");
    return;
  }

  const [existentes] = await db.execute(
    `SELECT hc FROM pacientes_ref WHERE origen_dato='ficticio'`
  ) as any;

  const existentesSet = new Set(
    existentes.map((r: Row) => r.hc)
  );

  for (const p of ficticios) {
    if (existentesSet.has(p.hc)) continue;

    await db.execute(
      `INSERT INTO pacientes_ref
       (hc,nombres,sexo,fecha_nacimiento,origen_dato,fecha_actualizacion,
        dni,apellido_paterno,apellido_materno)
       VALUES
       (${esc(p.hc)},${esc(p.nombres)},${esc(p.sexo)},${esc(p.fechaNacimiento)},
        'ficticio',NOW(),${esc(p.dni)},${esc(p.apellidoPaterno)},${esc(p.apellidoMaterno)})`
    );
  }

  console.log(`Pacientes ficticios preparados: ${ficticios.length}`);

  let insertados = 0;
  let egresos = 0;
  let movimientos = 0;

  const [diagRows] = await db.execute(
    `SELECT codigo,descripcion FROM diagnosticos WHERE activo=1`
  ) as any;

  const diagMap = new Map<string, Row>(
    diagRows.map((d: Row) => [d.codigo, d])
  );

  for (let i = 0; i < ingresosPlan.length; i++) {
    const x = ingresosPlan[i];

    const fechaIngreso = x.fecha;
    const tieneEgreso = i < 27;

    let fechaSalida: string | null = null;
    let tipoEgreso: string | null = null;

    if (tieneEgreso) {
      fechaSalida = fechaEgreso(fechaIngreso, 1 + (i % 10));
      tipoEgreso = TIPOS_EGRESO[i % TIPOS_EGRESO.length];
    }

    let servicioOrigenId: number | null = null;

    if (x.tipoIngreso === "transferencia") {
      const servicioAnterior =
        servicios[(i + 1) % servicios.length];
      servicioOrigenId = servicioAnterior.id;
    }

    const notaFicticia = `Paciente ficticio para pruebas de censo hospitalario. Estancia simulada en ${x.esp.nombre}.`;

    const [ingresoExistente] = await db.execute(
      `SELECT id FROM ingresos
       WHERE hc=${esc(x.paciente.hc)}
         AND notas_estancia=${esc(notaFicticia)}
       ORDER BY id DESC LIMIT 1`
    ) as any;

    if (ingresoExistente.length > 0) {
      console.log(`  ↳ Ingreso ficticio ya existe para ${x.paciente.hc}; se omite.`);
      continue;
    }

    await db.execute(
      `INSERT INTO ingresos
       (hc,cama_id,fecha_ingreso,medico,medico_id,tipo_ingreso,
        servicio_origen_id,financiamiento,usa_ventilador,usa_oxigeno,
        tiene_problema_judicial,tiene_problema_social,notas_estancia)
       VALUES
       (${esc(x.paciente.hc)},${x.cama.id},${esc(fechaIngreso)},
        ${esc(`${x.medico.nombres} ${x.medico.apellido_paterno} ${x.medico.apellido_materno || ""}`.trim())},
        ${x.medico.id},${esc(x.tipoIngreso)},${servicioOrigenId ?? "NULL"},
        ${esc(x.financiamiento)},${x.ventilador},${x.oxigeno},
        ${x.judicial},${x.social},
        ${esc(notaFicticia)})`
    );

    const [nuevoIngreso] = await db.execute(
      `SELECT id FROM ingresos WHERE hc=${esc(x.paciente.hc)}
       ORDER BY id DESC LIMIT 1`
    ) as any;

    const ingresoId = nuevoIngreso[0].id;

    const codigos = DIAGNOSTICOS_POR_ESPECIALIDAD[x.esp.nombre] || ["R69"];
    let orden = 1;

    for (const codigo of codigos.slice(0, i % 3 + 1)) {
      const d = diagMap.get(codigo);
      if (!d) continue;

      await db.execute(
        `INSERT INTO diagnosticos_ingreso
         (ingreso_id,orden,cie10_codigo,cie10_descripcion)
         VALUES
         (${ingresoId},${orden},${esc(d.codigo)},${esc(d.descripcion)})`
      );

      orden++;
    }

    insertados++;

    if (tieneEgreso && fechaSalida && tipoEgreso) {
      let destino = "NULL";

      if (tipoEgreso === "transferencia") {
        const destinoServicio =
          servicios[(i + 2) % servicios.length];
        destino = String(destinoServicio.id);
      }

      const codigoEgreso = codigos[0];
      const diagEgreso = diagMap.get(codigoEgreso);

      await db.execute(
        `INSERT INTO egresos
         (ingreso_id,fecha_egreso,tipo_egreso,diagnostico_final,
          codigo_egreso_original,servicio_destino_id,medico_alta,notas)
         VALUES
         (${ingresoId},${esc(fechaSalida)},${esc(tipoEgreso)},
          ${esc(diagEgreso?.descripcion || "Diagnóstico ficticio")},
          ${esc(codigoEgreso)},${destino},
          ${esc(`${x.medico.nombres} ${x.medico.apellido_paterno}`)},
          ${esc("Egreso generado para pruebas funcionales del sistema.")})`
      );

      egresos++;
    }

    if (false) {
      const camasDestino = camas.filter(
        (c: Row) =>
          c.id !== x.cama.id &&
          c.servicio_id === x.esp.servicio_id
      );

      if (camasDestino.length) {
        const destino = camasDestino[0];

        await db.execute(
          `INSERT INTO movimientos
           (ingreso_id,cama_origen_id,cama_destino_id,fecha)
           VALUES
           (${ingresoId},${x.cama.id},${destino.id},
            ${esc(fechaIngreso)})`
        );

        await db.execute(
          `UPDATE ingresos SET cama_id=${destino.id} WHERE id=${ingresoId}`
        );

        movimientos++;
      }
    }
  }

  console.log("\n=== RESULTADO ===");
  console.log(`Pacientes ficticios: ${ficticios.length}`);
  console.log(`Ingresos insertados: ${insertados}`);
  console.log(`Egresos insertados: ${egresos}`);
  console.log(`Movimientos insertados: ${movimientos}`);
  console.log("\nSeed demo terminado correctamente.\n");
}

main()
  .catch((error) => {
    console.error("\nERROR EN SEED DEMO:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
