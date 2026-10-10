import { NextResponse } from "next/server";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  ubicacionesIngreso,
  movimientos,
} from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import {
  fallo,
  HttpError,
  identificador,
  jsonObject,
  texto,
} from "@/lib/validation";
import { fechaEvento } from "@/lib/hospital";
import { lockCensus, writableEvent, audit } from "@/lib/census-store";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireWrite(true);
    const id = identificador((await ctx.params).id);
    const b = await jsonObject(request);
    const tipo = texto(b.tipo, "Evento", 10);
    if (!["ingreso", "traslado", "egreso"].includes(tipo))
      throw new HttpError("Evento inválido");
    const motivo = texto(b.motivo, "Motivo de corrección", 2000);
    let fecha: Date;
    try {
      fecha = fechaEvento(b.fecha, "Fecha corregida");
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    await db.transaction(async (tx) => {
      await lockCensus(tx);
      const [i] = await tx
        .select()
        .from(ingresos)
        .where(eq(ingresos.id, id))
        .for("update");
      if (!i) throw new HttpError("Hospitalización no encontrada", 404);
      const locs = await tx
        .select()
        .from(ubicacionesIngreso)
        .where(eq(ubicacionesIngreso.ingresoId, id))
        .orderBy(asc(ubicacionesIngreso.desde), asc(ubicacionesIngreso.id))
        .for("update");
      const [e] = await tx
        .select()
        .from(egresos)
        .where(eq(egresos.ingresoId, id))
        .for("update");
      if (!locs.length)
        throw new HttpError("Falta reconstruir el recorrido", 409);
      const before = {
        fechaIngreso: i.fechaIngreso,
        fechaEgreso: e?.fechaEgreso ?? null,
        ubicaciones: locs.map((l) => ({
          id: l.id,
          desde: l.desde,
          hasta: l.hasta,
        })),
      };
      let original: Date,
        camaDestino: number | null = null;
      if (tipo === "ingreso") {
        original = i.fechaIngreso;
        i.fechaIngreso = fecha;
        locs[0].desde = fecha;
      } else if (tipo === "egreso") {
        if (!e) throw new HttpError("No hay egreso para corregir", 409);
        original = e.fechaEgreso;
        e.fechaEgreso = fecha;
        locs[locs.length - 1].hasta = fecha;
      } else {
        const position = locs.findIndex(
          (l) => l.id === identificador(b.ubicacionId, "Ubicación"),
        );
        if (position < 1)
          throw new HttpError("Selecciona una ubicación de traslado", 400);
        original = locs[position].desde;
        camaDestino = locs[position].camaId;
        locs[position].desde = fecha;
        locs[position - 1].hasta = fecha;
      }
      await writableEvent(tx, +original < +fecha ? original : fecha);
      for (const l of locs) {
        if (l.hasta && +l.hasta < +l.desde)
          throw new HttpError(
            "La corrección altera el orden del recorrido",
            409,
          );
        if (l.hasta && +l.hasta === +l.desde) continue;
        const overlap = await tx
          .select({ id: ubicacionesIngreso.id })
          .from(ubicacionesIngreso)
          .where(
            and(
              eq(ubicacionesIngreso.camaId, l.camaId),
              ne(ubicacionesIngreso.ingresoId, id),
              sql`${ubicacionesIngreso.desde}<${l.hasta ?? new Date("9999-12-31T00:00:00Z")} AND (${ubicacionesIngreso.hasta} IS NULL OR ${ubicacionesIngreso.hasta}>${l.desde})`,
            ),
          )
          .limit(1);
        if (overlap.length)
          throw new HttpError(
            "La fecha corregida solapa otra estancia en la cama",
            409,
          );
      }
      const [patientOverlap] = await tx.execute(
        sql`SELECT a.id FROM ingresos a LEFT JOIN egresos x ON x.ingreso_id=a.id WHERE a.hc=${i.hc} AND a.id<>${id} AND a.fecha_ingreso<${e?.fechaEgreso ?? new Date("9999-12-31T00:00:00Z")} AND (x.fecha_egreso IS NULL OR x.fecha_egreso>${i.fechaIngreso}) LIMIT 1`,
      );
      if ((patientOverlap as unknown as unknown[]).length)
        throw new HttpError(
          "La fecha corregida solapa otra hospitalización del paciente",
          409,
        );
      if (tipo === "ingreso")
        await tx
          .update(ingresos)
          .set({ fechaIngreso: fecha })
          .where(eq(ingresos.id, id));
      if (tipo === "egreso")
        await tx
          .update(egresos)
          .set({ fechaEgreso: fecha })
          .where(eq(egresos.ingresoId, id));
      for (const l of locs)
        await tx
          .update(ubicacionesIngreso)
          .set({ desde: l.desde, hasta: l.hasta })
          .where(eq(ubicacionesIngreso.id, l.id));
      await tx
        .update(movimientos)
        .set({ fecha })
        .where(
          and(
            eq(movimientos.ingresoId, id),
            eq(movimientos.tipo, tipo),
            eq(movimientos.fecha, original),
            ...(camaDestino
              ? [eq(movimientos.camaDestinoId, camaDestino)]
              : []),
          ),
        );
      await audit(
        tx,
        user.usuario,
        "hospitalizacion",
        String(id),
        "corregir_fecha",
        before,
        {
          fechaIngreso: i.fechaIngreso,
          fechaEgreso: e?.fechaEgreso ?? null,
          ubicaciones: locs.map((l) => ({
            id: l.id,
            desde: l.desde,
            hasta: l.hasta,
          })),
          evento: tipo,
        },
        motivo,
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
