import { and, eq, gte, isNull, lt, inArray, or, asc } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Transaction } from "./clinical";
import {
  configuracionCenso,
  diasCenso,
  ingresos,
  egresos,
  pacientesRef,
  ubicacionesIngreso,
  periodosCama,
  servicios,
  camas,
  especialidades,
  auditoriaSistema,
} from "@/db/schema";
import { HttpError } from "./validation";
import { localDay, type CensusData } from "./census";
export async function configuration(tx: Transaction, lock = false) {
  const query = tx
    .select()
    .from(configuracionCenso)
    .where(eq(configuracionCenso.id, 1));
  const [config] = lock ? await query.for("update") : await query;
  if (!config)
    throw new HttpError("Falta preparar la configuración del censo", 503);
  return config;
}
export async function lockCensus(tx: Transaction) {
  return configuration(tx, true);
}
export function censusDayFor(date: Date, corte: string) {
  const [h, m] = corte.split(":").map(Number);
  return localDay(new Date(+date - (h * 60 + m) * 60000));
}
export async function writableEvent(tx: Transaction, date: Date) {
  const config = await configuration(tx);
  const fecha = censusDayFor(date, config.horaCorte);
  const [closed] = await tx
    .select()
    .from(diasCenso)
    .where(and(gte(diasCenso.fecha, fecha), eq(diasCenso.estado, "cerrado")))
    .orderBy(asc(diasCenso.fecha))
    .limit(1);
  if (closed)
    throw new HttpError(
      `El evento afecta el parte cerrado del ${closed.fecha}. Un administrador debe reabrir los días afectados y documentar la corrección.`,
      409,
    );
}
export async function audit(
  tx: Transaction,
  responsable: string,
  entidad: string,
  referencia: string,
  accion: string,
  antes: unknown,
  despues: unknown,
  motivo: string | null = null,
) {
  await tx
    .insert(auditoriaSistema)
    .values({
      entidad,
      referencia,
      accion,
      responsable,
      motivo,
      antes: antes === null ? null : JSON.stringify(antes),
      despues: despues === null ? null : JSON.stringify(despues),
      registradoEn: new Date(),
    });
}
export async function recordCapacity(
  tx: Transaction,
  camaId: number,
  responsable: string,
  motivo: string,
) {
  const [bed] = await tx
    .select({
      camaId: camas.id,
      cama: camas.numero,
      habilitada: camas.estado,
      servicioId: servicios.id,
      servicio: servicios.nombre,
      especialidad: especialidades.nombre,
    })
    .from(camas)
    .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
    .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
    .where(eq(camas.id, camaId));
  if (!bed) throw new HttpError("Cama sin estructura válida", 409);
  const [previous] = await tx
    .select()
    .from(periodosCama)
    .where(and(eq(periodosCama.camaId, camaId), isNull(periodosCama.hasta)))
    .for("update");
  const value = {
    camaId: bed.camaId,
    cama: bed.cama,
    habilitada: bed.habilitada !== "inoperativa",
    servicioId: bed.servicioId,
    servicio: bed.servicio,
    especialidad: bed.especialidad,
  };
  if (
    previous &&
    previous.cama === value.cama &&
    previous.habilitada === value.habilitada &&
    previous.servicioId === value.servicioId &&
    previous.servicio === value.servicio &&
    previous.especialidad === value.especialidad
  )
    return;
  const now = new Date();
  if (previous)
    await tx
      .update(periodosCama)
      .set({ hasta: now })
      .where(eq(periodosCama.id, previous.id));
  await tx
    .insert(periodosCama)
    .values({ ...value, desde: now, responsable, motivo });
  await audit(
    tx,
    responsable,
    "cama",
    String(camaId),
    "capacidad",
    previous
      ? {
          cama: previous.cama,
          habilitada: previous.habilitada,
          servicio: previous.servicio,
          especialidad: previous.especialidad,
        }
      : null,
    value,
    motivo,
  );
}
export async function loadCensus(
  tx: Transaction,
  inicio: Date,
  fin: Date,
): Promise<CensusData> {
  const config = await configuration(tx);
  const rows = await tx
    .select({ ingreso: ingresos, paciente: pacientesRef, egreso: egresos })
    .from(ingresos)
    .innerJoin(pacientesRef, eq(pacientesRef.hc, ingresos.hc))
    .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
    .where(
      and(
        lt(ingresos.fechaIngreso, fin),
        or(isNull(egresos.id), gte(egresos.fechaEgreso, inicio)),
      ),
    )
    .orderBy(asc(ingresos.id));
  const ids = rows.map((r) => r.ingreso.id);
  return {
    ingresos: rows.map((r) => r.ingreso),
    pacientes: [
      ...new Map(rows.map((r) => [r.paciente.hc, r.paciente])).values(),
    ],
    egresos: rows.flatMap((r) => (r.egreso ? [r.egreso] : [])),
    ubicaciones: ids.length
      ? await tx
          .select()
          .from(ubicacionesIngreso)
          .where(inArray(ubicacionesIngreso.ingresoId, ids))
          .orderBy(asc(ubicacionesIngreso.id))
      : [],
    capacidad: await tx
      .select()
      .from(periodosCama)
      .orderBy(asc(periodosCama.id)),
    servicios: await tx.select().from(servicios).orderBy(asc(servicios.id)),
    inicioCapacidad: config.inicioCapacidad,
  };
}
export function reportHash(content: unknown) {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}
