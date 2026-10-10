import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fechaEvento,
  fechaHospital,
  periodoReporte,
  diasEstancia,
} from "../src/lib/hospital.ts";
test("El período incluye todo el día de Perú con límite final exclusivo", () => {
  const p = periodoReporte("2026-09-01", "2026-09-01");
  assert.equal(p.inicio?.toISOString(), "2026-09-01T05:00:00.000Z");
  assert.equal(p.fin?.toISOString(), "2026-09-02T05:00:00.000Z");
});
test("Rechaza fechas imposibles, futuro y eventos antes del último traslado", () => {
  assert.throws(() => periodoReporte("2026-02-30", null));
  assert.throws(() => periodoReporte("2026-09-03", "2026-09-01"));
  assert.throws(() => fechaEvento("2099-01-01T12:00", "Ingreso"));
  assert.throws(() =>
    fechaEvento("2026-09-01T08:00", "Egreso", new Date("2026-09-01T14:00:00Z")),
  );
  assert.throws(() => fechaEvento("2026-02-30T08:00", "Ingreso"));
});
test("Fecha real se interpreta en Perú, independientemente del servidor", () => {
  assert.equal(
    fechaEvento("2026-09-01T08:00", "Ingreso").toISOString(),
    "2026-09-01T13:00:00.000Z",
  );
  assert.match(fechaHospital("2026-09-02T02:00:00Z"), /1/);
});
test("Días de estancia son días completos y no negativos", () => {
  assert.equal(diasEstancia("2026-09-01T13:00:00Z", "2026-09-02T12:59:59Z"), 0);
  assert.equal(diasEstancia("2026-09-01T13:00:00Z", "2026-09-02T13:00:00Z"), 1);
  assert.equal(diasEstancia("2026-09-02", "2026-09-01"), 0);
});
