import { and, desc, eq, isNull, or, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  camas,
  especialidades,
  servicios,
  ingresos,
  egresos,
  ubicacionesIngreso,
  periodosCama,
  configuracionCenso,
} from "@/db/schema";
import { HttpError } from "./validation";
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function ubicacion(tx: Transaction, camaId: number) {
  const [row] = await tx
    .select({
      camaId: camas.id,
      cama: camas.numero,
      estado: camas.estado,
      especialidadId: especialidades.id,
      especialidad: especialidades.nombre,
      servicioId: servicios.id,
      servicio: servicios.nombre,
    })
    .from(camas)
    .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
    .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
    .where(eq(camas.id, camaId))
    .for("update");
  if (!row) throw new HttpError("Cama no encontrada", 404);
  return row;
}
export async function ingresoAbierto(tx: Transaction, id: number) {
  const [row] = await tx
    .select()
    .from(ingresos)
    .where(eq(ingresos.id, id))
    .for("update");
  if (!row) throw new HttpError("Hospitalización no encontrada", 404);
  const [salida] = await tx
    .select({ id: egresos.id })
    .from(egresos)
    .where(eq(egresos.ingresoId, id));
  if (salida) throw new HttpError("La hospitalización ya está cerrada", 409);
  const [periodo] = await tx
    .select()
    .from(ubicacionesIngreso)
    .where(
      and(
        eq(ubicacionesIngreso.ingresoId, id),
        isNull(ubicacionesIngreso.hasta),
      ),
    )
    .orderBy(desc(ubicacionesIngreso.desde))
    .limit(1);
  if (!periodo)
    throw new HttpError(
      "Falta la ubicación activa. Verifica la migración de datos",
      409,
    );
  return { ingreso: row, periodo };
}

export async function disponibleDesde(
  tx: Transaction,
  camaId: number,
  fecha: Date,
) {
  const blocked = await tx
    .select({ id: periodosCama.id })
    .from(periodosCama)
    .where(
      and(
        eq(periodosCama.camaId, camaId),
        eq(periodosCama.habilitada, false),
        or(isNull(periodosCama.hasta), gt(periodosCama.hasta, fecha)),
      ),
    )
    .limit(1);
  if (blocked.length)
    throw new HttpError(
      "La estancia coincide con un período de bloqueo de esta cama",
      409,
    );
  const [config] = await tx
    .select()
    .from(configuracionCenso)
    .where(eq(configuracionCenso.id, 1));
  if (config && fecha >= config.inicioCapacidad) {
    const [known] = await tx
      .select({ id: periodosCama.id })
      .from(periodosCama)
      .where(
        and(
          eq(periodosCama.camaId, camaId),
          eq(periodosCama.habilitada, true),
          or(isNull(periodosCama.hasta), gt(periodosCama.hasta, fecha)),
          sql`${periodosCama.desde} <= ${fecha}`,
        ),
      )
      .limit(1);
    if (!known)
      throw new HttpError(
        "No hay capacidad registrada de la cama para esa fecha",
        409,
      );
  }
  const rows = await tx
    .select({ id: ubicacionesIngreso.id })
    .from(ubicacionesIngreso)
    .where(
      and(
        eq(ubicacionesIngreso.camaId, camaId),
        or(
          isNull(ubicacionesIngreso.hasta),
          gt(ubicacionesIngreso.hasta, fecha),
        ),
      ),
    )
    .limit(1);
  if (rows.length)
    throw new HttpError(
      "La fecha coincide con otra estancia en esa cama. Revisa la fecha real del evento.",
      409,
    );
}
