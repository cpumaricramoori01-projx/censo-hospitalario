import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyReport,
  historicalCensus,
  monthlyIndicators,
  dayWindow,
  statisticalStay,
  type CensusData,
} from "../src/lib/census.ts";
const instant = (value: string) => new Date(value + "-05:00");
function fixture(): CensusData {
  return {
    servicios: [
      { id: 1, nombre: "Medicina" },
      { id: 2, nombre: "UCI" },
    ],
    pacientes: [
      {
        hc: "A",
        nombres: "A",
        apellidoPaterno: "Prueba",
        apellidoMaterno: null,
      },
      {
        hc: "B",
        nombres: "B",
        apellidoPaterno: "Prueba",
        apellidoMaterno: null,
      },
    ],
    ingresos: [
      {
        id: 1,
        hc: "A",
        fechaIngreso: instant("2026-09-01T22:00:00"),
        servicioIngresoId: 1,
        servicioIngreso: "Medicina",
      },
      {
        id: 2,
        hc: "B",
        fechaIngreso: instant("2026-09-02T08:00:00"),
        servicioIngresoId: 1,
        servicioIngreso: "Medicina",
      },
    ],
    egresos: [
      {
        ingresoId: 1,
        fechaEgreso: instant("2026-09-03T09:00:00"),
        servicioEgresoId: 2,
        servicioEgreso: "UCI",
        tipoEgreso: "alta_medica",
      },
      {
        ingresoId: 2,
        fechaEgreso: instant("2026-09-02T11:00:00"),
        servicioEgresoId: 1,
        servicioEgreso: "Medicina",
        tipoEgreso: "fallecido",
      },
    ],
    ubicaciones: [
      {
        id: 1,
        ingresoId: 1,
        camaId: 1,
        servicioId: 1,
        servicio: "Medicina",
        especialidad: "Medicina",
        cama: "M1",
        desde: instant("2026-09-01T22:00:00"),
        hasta: instant("2026-09-02T10:00:00"),
      },
      {
        id: 2,
        ingresoId: 1,
        camaId: 3,
        servicioId: 2,
        servicio: "UCI",
        especialidad: "UCI",
        cama: "U1",
        desde: instant("2026-09-02T10:00:00"),
        hasta: instant("2026-09-03T09:00:00"),
      },
      {
        id: 3,
        ingresoId: 2,
        camaId: 2,
        servicioId: 1,
        servicio: "Medicina",
        especialidad: "Medicina",
        cama: "M2",
        desde: instant("2026-09-02T08:00:00"),
        hasta: instant("2026-09-02T11:00:00"),
      },
    ],
    capacidad: [1, 2, 3].map((camaId) => ({
      camaId,
      servicioId: camaId === 3 ? 2 : 1,
      servicio: camaId === 3 ? "UCI" : "Medicina",
      especialidad: "General",
      cama: String(camaId),
      habilitada: true,
      desde: instant("2026-08-01T00:00:00"),
      hasta: null,
    })),
    inicioCapacidad: instant("2026-08-01T00:00:00"),
  };
}
const now = instant("2026-10-01T00:00:00");
test("Censo al instante usa el destino del traslado y excluye el egreso exacto", () => {
  const d = fixture();
  assert.equal(
    historicalCensus(d, instant("2026-09-02T10:00:00")).pacientes.find(
      (p) => p.ingresoId === 1,
    )?.servicioId,
    2,
  );
  assert.equal(
    historicalCensus(d, instant("2026-09-02T10:00:00"), true).pacientes.find(
      (p) => p.ingresoId === 1,
    )?.servicioId,
    1,
  );
  assert.equal(
    historicalCensus(d, instant("2026-09-03T09:00:00")).pacientes.length,
    0,
  );
});
test("Parte concilia servicios, traslados y fallecidos sin duplicar egresos", () => {
  const r = dailyReport(fixture(), "2026-09-02", "00:00", now);
  assert.deepEqual(
    [
      r.total.inicial,
      r.total.ingresos,
      r.total.recibidos,
      r.total.enviados,
      r.total.egresos,
      r.total.fallecidos,
      r.total.final,
    ],
    [1, 1, 1, 1, 1, 1, 1],
  );
  assert.equal(r.total.diferencia, 0);
  assert.equal(r.inconsistencias.length, 0);
  assert.equal(r.servicios.find((s) => s.servicioId === 1)?.final, 0);
  assert.equal(r.servicios.find((s) => s.servicioId === 2)?.final, 1);
});
test("Pacientes-día incluye estancias intradiarias y no usa duración de 24 horas", () => {
  const r = dailyReport(fixture(), "2026-09-02", "00:00", now);
  assert.equal(r.total.pacientesDia, 2);
  assert.equal(r.servicios.find((s) => s.servicioId === 1)?.pacientesDia, 1);
  assert.equal(
    statisticalStay(
      instant("2026-09-02T08:00:00"),
      instant("2026-09-02T11:00:00"),
    ),
    1,
  );
});
test("Evento a medianoche corresponde al nuevo día, sin alterar existencia inicial", () => {
  const d = fixture();
  d.ubicaciones[0].hasta = instant("2026-09-02T00:00:00");
  d.ubicaciones[1].desde = instant("2026-09-02T00:00:00");
  const r = dailyReport(d, "2026-09-02", "00:00", now);
  assert.equal(r.servicios.find((s) => s.servicioId === 1)?.inicial, 1);
  assert.equal(r.total.recibidos, 1);
  assert.equal(r.inconsistencias.length, 0);
});
test("Traslado de cama dentro del mismo servicio no cuenta como traslado entre servicios", () => {
  const d = fixture();
  d.ubicaciones[1].servicioId = 1;
  d.ubicaciones[1].servicio = "Medicina";
  const r = dailyReport(d, "2026-09-02", "00:00", now);
  assert.equal(r.total.recibidos, 0);
  assert.equal(r.total.enviados, 0);
  assert.equal(r.inconsistencias.length, 0);
});
test("Capacidad desconocida se conserva como N/D y bloqueo cambia el denominador", () => {
  const d = fixture();
  d.inicioCapacidad = instant("2026-09-02T12:00:00");
  assert.equal(
    dailyReport(d, "2026-09-02", "00:00", now).total.camasDisponibles,
    null,
  );
  assert.equal(
    monthlyIndicators(d, "2026-09", "00:00", now).total.ocupacion,
    null,
  );
  d.inicioCapacidad = instant("2026-08-01T00:00:00");
  d.capacidad[1].habilitada = false;
  assert.equal(
    dailyReport(d, "2026-09-02", "00:00", now).total.camasDisponibles,
    2,
  );
});
test("Indicadores agregan días completos, permanencia estadística y capacidad histórica", () => {
  const r = monthlyIndicators(fixture(), "2026-09", "00:00", now);
  assert.equal(r.diasCerrados, 30);
  assert.equal(r.total.pacientesDia, 3);
  assert.equal(r.total.diasCama, 90);
  assert.equal(r.total.egresos, 2);
  assert.equal(r.total.promedioPermanencia, 1.5);
  assert.equal(r.total.rendimientoCama, 2 / 3);
  assert.equal(r.total.intervaloSustitucion, 43.5);
  assert.equal(r.total.ocupacion, (3 / 90) * 100);
});
test("Mes en curso excluye el día incompleto y períodos inválidos fallan", () => {
  assert.equal(
    monthlyIndicators(
      fixture(),
      "2026-09",
      "00:00",
      instant("2026-09-02T12:00:00"),
    ).diasCerrados,
    1,
  );
  assert.throws(() => dayWindow("2026-02-30"));
  assert.throws(() => dayWindow("2026-09-01", "25:00"));
  assert.throws(() => monthlyIndicators(fixture(), "2026-13"));
  assert.equal(
    dayWindow("2026-09-01", "07:00").inicio.toISOString(),
    "2026-09-01T12:00:00.000Z",
  );
});
test("Falta de ubicación y camas duplicadas se señalan como inconsistencias", () => {
  const d = fixture();
  d.ubicaciones = d.ubicaciones.filter((l) => l.ingresoId !== 2);
  assert.ok(
    dailyReport(d, "2026-09-02", "00:00", instant("2026-09-02T09:00:00"))
      .inconsistencias.length,
  );
  const c = fixture();
  c.ubicaciones[2].camaId = 1;
  assert.ok(
    historicalCensus(c, instant("2026-09-02T09:00:00")).inconsistencias.some(
      (i) => i.includes("varias hospitalizaciones"),
    ),
  );
});

test("Historias repetidas en dos hospitalizaciones simultáneas se detectan", () => {
  const d = fixture();
  d.ingresos[1].hc = "A";
  assert.ok(
    historicalCensus(d, instant("2026-09-02T09:00:00")).inconsistencias.some(
      (i) => i.includes("varias hospitalizaciones al corte"),
    ),
  );
});
