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
  throw Error("Solo admite la BD local aislada censo_test");
const db = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  timezone: "Z",
});
let count = 0;
const check = (ok, label) => {
  assert.ok(ok, label);
  console.log("✓", label);
  count++;
};
async function req(path, { method = "GET", body, cookie, origin = true } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: base } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  return {
    status: r.status,
    data,
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function login(usuario) {
  const r = await req("/api/auth/login", {
    method: "POST",
    body: { usuario, password: "local-test-password-123" },
  });
  check(r.status === 200, "Acceso de " + usuario);
  return r.cookie;
}
try {
  const admin = await login("admin.test"),
    reader = await login("consulta.test"),
    operator = await login("operador.test");
  for (const path of [
    "/api/censo/historico?fecha=2026-09-05&hora=10:00",
    "/api/censo/parte?fecha=2026-09-05",
    "/api/reportes/indicadores?mes=2026-09",
    "/api/censo/camas",
    "/api/censo/pendientes",
    "/api/auditoria",
  ])
    check(
      (await req(path)).status === 401,
      "Información protegida sin sesión: " + path,
    );
  check(
    (await req("/api/auditoria", { cookie: reader })).status === 403,
    "Consulta no accede a auditoría",
  );
  check(
    (
      await req("/api/censo/configuracion", {
        method: "PATCH",
        cookie: operator,
        body: { horaCorte: "00:00", alertaEstancia: 10, motivo: "Prueba" },
      })
    ).status === 403,
    "Operador no cambia reglas del censo",
  );
  let r = await req("/api/censo/configuracion", {
    method: "PATCH",
    cookie: admin,
    body: {
      horaCorte: "07:00",
      alertaEstancia: 20,
      motivo: "Corte de guardia ficticio",
    },
  });
  check(
    r.status === 200,
    "Corte y alerta configurables antes del primer cierre",
  );
  r = await req("/api/censo/configuracion", {
    method: "PATCH",
    cookie: admin,
    body: {
      horaCorte: "00:00",
      alertaEstancia: 14,
      motivo: "Volver al corte de prueba",
    },
  });
  check(r.status === 200, "Restablecer configuración inicial");
  check(
    (
      await req("/api/censo/historico?fecha=2026-02-30&hora=10:00", {
        cookie: admin,
      })
    ).status === 400,
    "Fecha inexistente rechazada",
  );
  check(
    (await req("/api/reportes/indicadores?mes=2026-13", { cookie: admin }))
      .status === 400,
    "Mes inexistente rechazado",
  );
  r = await req("/api/reportes/indicadores?mes=2026-09", { cookie: admin });
  check(
    r.status === 200 && r.data.total.ocupacion === null,
    "No inventa capacidad de meses anteriores",
  );
  // Historia de capacidad ficticia: exclusivamente la BD temporal validada al inicio.
  await db.query(
    "UPDATE configuracion_censo SET inicio_capacidad='2026-09-01 05:00:00'",
  );
  await db.query("UPDATE periodos_cama SET desde='2026-09-01 05:00:00'");
  r = await req("/api/camas", {
    method: "POST",
    cookie: admin,
    body: {
      numero: "OPSU0",
      ubicacion: "Prueba",
      especialidadId: 2,
      estado: "libre",
      motivo: "Destino ficticio",
    },
  });
  check(r.status === 201, "Cama de destino aislada de recorridos anteriores");
  const destination = r.data.id;
  await db.query(
    "UPDATE periodos_cama SET desde='2026-09-01 05:00:00' WHERE cama_id=?",
    [destination],
  );
  const body = {
    hc: "OPS001",
    camaId: 5,
    nombres: "Paciente",
    apellidoPaterno: "Operación",
    sexo: "M",
    medicoId: 1,
    tipoIngreso: "normal",
    financiamiento: "SIS",
    usaOxigeno: false,
    usaVentilador: false,
    tieneProblemaJudicial: false,
    tieneProblemaSocial: false,
    notasEstancia: "",
    diagnosticos: [{ cie10Codigo: "Z00", cie10Descripcion: "Prueba" }],
    fechaIngreso: "2026-09-05T08:00",
  };
  r = await req("/api/ingresos", { method: "POST", cookie: admin, body });
  check(r.status === 201, "Ingreso ficticio para probar parte diario");
  const id = r.data.id;
  r = await req(`/api/hospitalizaciones/${id}/traslados`, {
    method: "POST",
    cookie: admin,
    body: {
      camaId: destination,
      fecha: "2026-09-06T10:00",
      motivo: "Prueba de servicio",
    },
  });
  check(r.status === 200, "Traslado ficticio entre servicios");
  r = await req("/api/egresos", {
    method: "POST",
    cookie: admin,
    body: {
      ingresoId: id,
      fechaEgreso: "2026-09-07T09:00",
      tipoEgreso: "alta_medica",
      medicoAltaId: 1,
      diagnosticoFinal: "Prueba",
    },
  });
  check(r.status === 201, "Egreso ficticio");
  r = await req("/api/censo/historico?fecha=2026-09-06&hora=09:00", {
    cookie: reader,
  });
  check(
    r.status === 200 &&
      r.data.pacientes.find((p) => p.ingresoId === id)?.servicioId === 1,
    "Censo anterior al traslado conserva origen",
  );
  r = await req("/api/censo/historico?fecha=2026-09-06&hora=10:00", {
    cookie: reader,
  });
  check(
    r.status === 200 &&
      r.data.pacientes.find((p) => p.ingresoId === id)?.servicioId === 2,
    "Censo al instante del traslado usa destino",
  );
  r = await req("/api/censo/parte?fecha=2026-09-06", { cookie: reader });
  check(
    r.status === 200 &&
      r.data.reporte.inconsistencias.length === 0 &&
      r.data.reporte.total.recibidos === 1 &&
      r.data.reporte.total.enviados === 1,
    "Parte concilia el traslado entre servicios",
  );
  const close = {
    fecha: "2026-09-05",
    accion: "cerrar",
    version: 0,
    motivo: "Revisión ficticia",
  };
  check(
    (
      await req("/api/censo/parte", {
        method: "POST",
        cookie: operator,
        body: close,
      })
    ).status === 403,
    "Solo administrador cierra partes",
  );
  check(
    (
      await req("/api/censo/parte", {
        method: "POST",
        cookie: admin,
        body: close,
        origin: false,
      })
    ).status === 403,
    "Cierre requiere origen válido",
  );
  const parallel = await Promise.all([
    req("/api/censo/parte", { method: "POST", cookie: admin, body: close }),
    req("/api/censo/parte", { method: "POST", cookie: admin, body: close }),
  ]);
  check(
    parallel
      .map((r) => r.status)
      .sort()
      .join(",") === "200,409",
    "Cierres simultáneos producen una única versión",
  );
  r = await req("/api/censo/parte?fecha=2026-09-05", { cookie: admin });
  check(
    r.status === 200 &&
      r.data.estado === "cerrado" &&
      r.data.version === 1 &&
      r.data.esVersionGuardada,
    "Parte cerrado consulta su versión conservada",
  );
  check(
    (
      await req("/api/ingresos", {
        method: "POST",
        cookie: admin,
        body: { ...body, hc: "BLOCKED_OPS", fechaIngreso: "2026-09-04T07:00" },
      })
    ).status === 409,
    "Registro atrasado no altera partes cerrados",
  );
  const correction = {
    tipo: "ingreso",
    fecha: "2026-09-04T08:00",
    motivo: "Corregir fecha ficticia",
  };
  check(
    (
      await req(`/api/hospitalizaciones/${id}/correccion`, {
        method: "POST",
        cookie: reader,
        body: correction,
      })
    ).status === 403,
    "Consulta no corrige fechas",
  );
  check(
    (
      await req(`/api/hospitalizaciones/${id}/correccion`, {
        method: "POST",
        cookie: admin,
        body: correction,
      })
    ).status === 409,
    "Corrección exige reabrir el parte afectado",
  );
  check(
    (
      await req("/api/censo/parte", {
        method: "POST",
        cookie: admin,
        body: {
          fecha: "2026-09-05",
          accion: "reabrir",
          version: 1,
          motivo: "",
        },
      })
    ).status === 400,
    "Reapertura exige motivo",
  );
  check(
    (
      await req("/api/censo/parte", {
        method: "POST",
        cookie: admin,
        body: {
          fecha: "2026-09-05",
          accion: "reabrir",
          version: 0,
          motivo: "Prueba",
        },
      })
    ).status === 409,
    "Versión obsoleta no reabre el parte",
  );
  r = await req("/api/censo/parte", {
    method: "POST",
    cookie: admin,
    body: {
      fecha: "2026-09-05",
      accion: "reabrir",
      version: 1,
      motivo: "Corregir ingreso ficticio",
    },
  });
  check(r.status === 200, "Reapertura documentada");
  r = await req(`/api/hospitalizaciones/${id}/correccion`, {
    method: "POST",
    cookie: admin,
    body: correction,
  });
  check(
    r.status === 200,
    "Fecha de ingreso corregida con recorrido consistente",
  );
  r = await req("/api/censo/parte?fecha=2026-09-05", { cookie: admin });
  check(
    r.data.hayCambios && r.data.reporte.total.inicial === 1,
    "Parte abierto detecta diferencias contra versión anterior",
  );
  r = await req("/api/censo/parte", {
    method: "POST",
    cookie: admin,
    body: {
      fecha: "2026-09-05",
      accion: "cerrar",
      version: 1,
      motivo: "Validar corrección ficticia",
    },
  });
  check(
    r.status === 200 && r.data.version === 2,
    "Nuevo cierre conserva una segunda versión",
  );
  r = await req("/api/censo/parte?fecha=2026-09-05&version=1", {
    cookie: admin,
  });
  check(
    r.data.reporte.total.ingresos === 1 &&
      r.data.reporte.total.inicial === 0 &&
      r.data.versiones.length === 2,
    "Primera versión permanece intacta tras corregir",
  );
  check(
    (
      await req(`/api/hospitalizaciones/${id}/correccion`, {
        method: "POST",
        cookie: admin,
        body: {
          tipo: "ingreso",
          fecha: "2026-09-08T08:00",
          motivo: "Fecha fuera del recorrido",
        },
      })
    ).status === 409,
    "Corrección que altera orden temporal rechazada",
  );
  check(
    (
      await req("/api/censo/configuracion", {
        method: "PATCH",
        cookie: admin,
        body: {
          horaCorte: "07:00",
          alertaEstancia: 14,
          motivo: "Cambio tardío",
        },
      })
    ).status === 409,
    "Corte protegido después del primer cierre",
  );
  check(
    (
      await req(`/api/hospitalizaciones/${id}/revision`, {
        method: "PATCH",
        cookie: reader,
        body: {
          fechaNacimiento: "1990-01-01",
          financiamiento: "SIS",
          motivo: "Prueba",
        },
      })
    ).status === 403,
    "Consulta no cambia datos administrativos",
  );
  check(
    (
      await req(`/api/hospitalizaciones/${id}/revision`, {
        method: "PATCH",
        cookie: admin,
        body: {
          fechaNacimiento: "2027-01-01",
          financiamiento: "SIS",
          motivo: "Prueba",
        },
      })
    ).status === 400,
    "Nacimiento posterior al ingreso rechazado",
  );
  r = await req(`/api/hospitalizaciones/${id}/revision`, {
    method: "PATCH",
    cookie: admin,
    body: {
      fechaNacimiento: "1990-01-01",
      financiamiento: "SIS actualizado",
      motivo: "Completar información ficticia",
    },
  });
  check(
    r.status === 200,
    "Datos incompletos se pueden completar con auditoría",
  );
  r = await req("/api/camas", {
    method: "POST",
    cookie: admin,
    body: {
      numero: "OPS1",
      ubicacion: "Prueba",
      especialidadId: 1,
      estado: "libre",
      motivo: "Cama ficticia",
    },
  });
  check(r.status === 201, "Nueva cama inicia historial de capacidad");
  const bed = r.data;
  r = await req("/api/camas", {
    method: "PATCH",
    cookie: admin,
    body: { ...bed, estado: "inoperativa", motivo: "Mantenimiento ficticio" },
  });
  check(r.status === 200, "Bloqueo de cama crea período");
  r = await req("/api/camas", {
    method: "PATCH",
    cookie: admin,
    body: { ...bed, estado: "libre", motivo: "Finalizar mantenimiento" },
  });
  check(r.status === 200, "Rehabilitación conserva períodos anteriores");
  r = await req("/api/censo/camas?camaId=" + bed.id, { cookie: admin });
  check(
    r.status === 200 &&
      r.data.length === 3 &&
      r.data.filter((p) => !p.hasta).length === 1 &&
      r.data[0].habilitada,
    "Una sola capacidad activa y tres períodos conservados",
  );
  r = await req("/api/reportes/indicadores?mes=2026-09", { cookie: reader });
  check(
    r.status === 200 &&
      r.data.total.diasCama > 0 &&
      r.data.total.ocupacion !== null,
    "Indicadores usan la capacidad ficticia conocida",
  );
  r = await req("/api/censo/pendientes", { cookie: reader });
  check(
    r.status === 200 && r.data.pendientes.some((p) => p.motivos.length),
    "Bandeja detecta pendientes en datos ficticios",
  );
  r = await req("/api/auditoria?referencia=" + id, { cookie: admin });
  check(
    r.status === 200 &&
      r.data.eventos.some((e) => e.accion === "corregir_fecha"),
    "Auditoría muestra correcciones y movimientos",
  );
  for (const path of [
    "/censo/historico",
    "/censo/parte",
    "/censo/camas",
    "/reportes/indicadores",
    "/pendientes",
    "/auditoria",
    "/configuracion",
  ])
    check(
      (await req(path, { cookie: admin })).status === 200,
      "Pantalla protegida disponible: " + path,
    );
  console.log("Operación ampliada verificada:", count, "comprobaciones");
} finally {
  await db.end();
}
