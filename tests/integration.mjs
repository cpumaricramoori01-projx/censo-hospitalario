import assert from "node:assert/strict";
import mysql from "mysql2/promise";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  new URL(base).hostname !== "127.0.0.1" ||
  url.hostname !== "127.0.0.1" ||
  url.port !== "33306" ||
  url.pathname !== "/censo_test"
)
  throw new Error("Solo admite el entorno local de prueba");
const db = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  timezone: "Z",
});
let count = 0;
function check(condition, message) {
  assert.ok(condition, message);
  count++;
  console.log(`✓ ${message}`);
}
async function request(
  path,
  { method = "GET", body, cookie, origin = true } = {},
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: base } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return {
    status: res.status,
    data,
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
async function login(usuario) {
  const res = await request("/api/auth/login", {
    method: "POST",
    body: { usuario, password: "local-test-password-123" },
  });
  check(res.status === 200, `Inicio de sesión de ${usuario}`);
  return res.cookie;
}
const clinical = (hc, camaId) => ({
  hc,
  camaId,
  nombres: "Paciente",
  apellidoPaterno: "Prueba",
  sexo: "M",
  medicoId: 1,
  tipoIngreso: "normal",
  financiamiento: "SIS Gratuito",
  usaOxigeno: false,
  usaVentilador: false,
  tieneProblemaJudicial: false,
  tieneProblemaSocial: false,
  notasEstancia: "",
  diagnosticos: [
    { cie10Codigo: "Z00", cie10Descripcion: "Diagnóstico de prueba" },
  ],
  fechaIngreso: "2026-09-20T08:00",
});
try {
  const [legacy] = await db.query(
    "SELECT i.servicio_ingreso,i.registrado_por,u.servicio FROM ingresos i JOIN ubicaciones_ingreso u ON u.ingreso_id=i.id WHERE i.id=1",
  );
  check(
    legacy[0]?.servicio_ingreso === "Medicina" &&
      legacy[0]?.registrado_por === "legacy",
    "La migración conserva ubicación histórica y marca los registros anteriores",
  );
  let r = await request("/api/censo/pacientes");
  check(r.status === 401, "Datos de pacientes protegidos sin sesión");
  const operator = await login("operador.test");
  const admin = await login("admin.test");
  const reader = await login("consulta.test");
  for (const [cookie, origin] of [[operator, true], [reader, true], [admin, false]]) {
    const denied = await request("/api/test-servicio", {
      method: "POST",
      body: { nombre: "Servicio sin permiso" },
      cookie,
      origin,
    });
    check(denied.status === 403, "La ruta antigua de prueba respeta rol y origen");
  }
  r = await request("/api/servicios", {
    method: "POST",
    body: { nombre: "No autorizado" },
    cookie: operator,
  });
  check(r.status === 403, "Operador no puede modificar estructura");
  r = await request("/api/ingresos", {
    method: "POST",
    body: clinical("BLOCKED", 1),
    cookie: reader,
  });
  check(r.status === 403, "Consulta no puede registrar ingresos");
  r = await request("/api/ingresos", {
    method: "POST",
    body: clinical("ORIGIN", 1),
    cookie: operator,
    origin: false,
  });
  check(r.status === 403, "Mutaciones rechazan solicitudes sin origen válido");
  r = await request("/api/camas", {
    method: "POST",
    body: { numero: "Invalid", especialidadId: 1, estado: "ocupada" },
    cookie: admin,
  });
  check(r.status === 400, "No se crea una cama ocupada sin paciente");
  for (const body of [
    null,
    [],
    { ...clinical("INVALID", 1), diagnosticos: [null] },
  ]) {
    const invalid = await request("/api/ingresos", {
      method: "POST",
      body,
      cookie: operator,
    });
    check(
      invalid.status === 400,
      "Solicitudes malformadas devuelven un error de validación",
    );
  }
  const parallel = await Promise.all([
    request("/api/ingresos", {
      method: "POST",
      body: clinical("RACEPATIENT", 1),
      cookie: operator,
    }),
    request("/api/ingresos", {
      method: "POST",
      body: clinical("RACEPATIENT", 2),
      cookie: operator,
    }),
  ]);
  check(
    parallel.filter((x) => x.status === 201).length === 1 &&
      parallel.filter((x) => x.status === 409).length === 1,
    "Dos ingresos simultáneos del mismo paciente dejan una sola hospitalización activa",
  );
  const winner = parallel.find((x) => x.status === 201);
  const id = winner.data.id;
  const [active] = await db.query(
    "SELECT cama_id FROM ocupaciones_activas WHERE ingreso_id=?",
    [id],
  );
  const oldBed = active[0].cama_id;
  const otherBed = oldBed === 1 ? 2 : 1;
  const sameBed = await Promise.all([
    request("/api/ingresos", {
      method: "POST",
      body: clinical("RACEBED-A", otherBed),
      cookie: operator,
    }),
    request("/api/ingresos", {
      method: "POST",
      body: clinical("RACEBED-B", otherBed),
      cookie: operator,
    }),
  ]);
  check(
    sameBed.filter((x) => x.status === 201).length === 1 &&
      sameBed.filter((x) => x.status === 409).length === 1,
    "Dos pacientes compitiendo por una cama dejan una sola asignación",
  );
  r = await request(`/api/hospitalizaciones/${id}/traslados`, {
    method: "POST",
    body: { camaId: otherBed, fecha: "2026-09-21T08:00", motivo: "Prueba" },
    cookie: operator,
  });
  check(r.status === 409, "Traslado a una cama ocupada se rechaza");
  r = await request(`/api/hospitalizaciones/${id}/traslados`, {
    method: "POST",
    body: { camaId: 4, fecha: "2026-09-21T08:00", motivo: "Prueba" },
    cookie: operator,
  });
  check(r.status === 409, "Traslado a cama inoperativa se rechaza");
  r = await request(`/api/hospitalizaciones/${id}/traslados`, {
    method: "POST",
    body: { camaId: 3, fecha: "2026-09-19T08:00", motivo: "Prueba" },
    cookie: operator,
  });
  check(r.status === 400, "Traslado anterior al ingreso se rechaza");
  r = await request(`/api/hospitalizaciones/${id}/traslados`, {
    method: "POST",
    body: {
      camaId: 3,
      fecha: "2026-09-21T08:00",
      motivo: "Cambio a UCI de prueba",
    },
    cookie: operator,
  });
  check(r.status === 200, "Traslado a UCI conserva la hospitalización");
  r = await request(`/api/hospitalizaciones/${id}`, {
    method: "PATCH",
    body: {
      medicoId: 1,
      usaOxigeno: true,
      usaVentilador: true,
      tieneProblemaJudicial: false,
      tieneProblemaSocial: true,
      notasEstancia: "Nota actualizada",
      diagnosticos: [{ cie10Codigo: "Z00", cie10Descripcion: "Actualizado" }],
    },
    cookie: operator,
  });
  check(
    r.status === 200,
    "Recursos y diagnósticos se actualizan durante la estancia",
  );
  r = await request(`/api/hospitalizaciones/${id}`, { cookie: operator });
  check(
    r.data.ubicaciones.length === 2 &&
      r.data.historial.some((x) => x.tipo === "actualizacion"),
    "Ficha contiene dos ubicaciones y auditoría de cambios",
  );
  const summary = await request("/api/censo/resumen", { cookie: operator });
  const occupancy = await request("/api/reportes/ocupacion", {
    cookie: operator,
  });
  check(
    summary.data.camas.ocupadas === occupancy.data.resumen.ocupadas &&
      summary.data.pacientes.hospitalizados === summary.data.camas.ocupadas,
    "Panel y reporte usan la misma ocupación",
  );
  r = await request("/api/egresos", {
    method: "POST",
    body: {
      ingresoId: id,
      tipoEgreso: "alta_medica",
      medicoAltaId: 1,
      diagnosticoFinal: "Prueba",
      fechaEgreso: "2026-09-20T10:00",
    },
    cookie: operator,
  });
  check(r.status === 400, "Egreso anterior al último traslado se rechaza");
  const exit = {
    ingresoId: id,
    tipoEgreso: "alta_medica",
    medicoAltaId: 1,
    diagnosticoFinal: "Prueba",
    fechaEgreso: "2026-09-22T08:00",
  };
  const exits = await Promise.all([
    request("/api/egresos", { method: "POST", body: exit, cookie: operator }),
    request("/api/egresos", { method: "POST", body: exit, cookie: operator }),
  ]);
  check(
    exits.filter((x) => x.status === 201).length === 1 &&
      exits.filter((x) => x.status === 409).length === 1,
    "Egreso simultáneo se registra una vez y libera la cama",
  );
  r = await request("/api/camas", {
    method: "PATCH",
    body: { id: 3, numero: "U01", especialidadId: 1, estado: "libre" },
    cookie: admin,
  });
  check(
    r.status === 200,
    "Una cama libre puede reorganizarse después del egreso",
  );
  r = await request(
    "/api/reportes/egresos?desde=2026-09-22&hasta=2026-09-22&servicioId=2",
    { cookie: operator },
  );
  check(
    r.data.some((x) => x.ingresoId === id && x.servicio === "UCI"),
    "Reporte de egreso conserva el servicio histórico aunque la cama cambie",
  );
  r = await request("/api/reportes/ingresos?servicioId=1", {
    cookie: operator,
  });
  check(
    r.data.some((x) => x.id === id && x.servicio === "Medicina"),
    "Reporte de ingreso conserva el servicio inicial",
  );
  r = await request(
    "/api/reportes/estancia?desde=2026-09-20&hasta=2026-09-20",
    { cookie: operator },
  );
  check(
    r.data.resumen.promedioEgresadas === 2 &&
      Number.isFinite(r.data.resumen.promedioActivas),
    "Promedio de egresadas separado de la estancia acumulada activa",
  );
  r = await request("/api/reportes/egresos?desde=2026-02-30", {
    cookie: operator,
  });
  check(r.status === 400, "Filtros rechazan fechas imposibles");
  r = await request(`/api/hospitalizaciones/${id}`, {
    method: "PATCH",
    body: {
      medicoId: 1,
      usaOxigeno: false,
      usaVentilador: false,
      tieneProblemaJudicial: false,
      tieneProblemaSocial: false,
      diagnosticos: [{ cie10Descripcion: "Prueba" }],
    },
    cookie: operator,
  });
  check(r.status === 409, "Una estancia cerrada no se edita");
  r = await request("/api/ingresos", {
    method: "POST",
    body: { ...clinical("BACKDATED", 3), fechaIngreso: "2026-09-20T08:00" },
    cookie: operator,
  });
  check(
    r.status === 409,
    "Un ingreso atrasado no solapa otra estancia histórica de la cama",
  );
  const [rollback] = await db.query(
    "SELECT hc FROM pacientes_ref WHERE hc='BACKDATED'",
  );
  check(
    !rollback.length,
    "La transacción revierte la creación parcial del paciente al fallar",
  );
  for (let i = 0; i < 6; i++)
    r = await request("/api/auth/login", {
      method: "POST",
      body: { usuario: "no.existe", password: "incorrecta" },
    });
  check(r.status === 429, "Intentos de acceso limitados en la base compartida");
  console.log(`Validación integrada completada: ${count} comprobaciones`);
} finally {
  await db.end();
}
