import { jsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  camas,
  ingresos,
  ocupacionesActivas,
  ubicacionesIngreso,
  movimientos,
} from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import { fallo, HttpError, identificador, texto } from "@/lib/validation";
import { fechaEvento } from "@/lib/hospital";
import { ingresoAbierto, ubicacion, disponibleDesde } from "@/lib/clinical";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireWrite();
    const id = identificador((await ctx.params).id);
    const b = await jsonObject(request);
    const camaId = identificador(b.camaId, "Cama de destino");
    const motivo = texto(b.motivo, "Motivo", 1000);
    await db.transaction(async (tx) => {
      const { ingreso, periodo } = await ingresoAbierto(tx, id);
      if (camaId === ingreso.camaId)
        throw new HttpError("Selecciona una cama diferente");
      let fecha: Date;
      try {
        fecha = fechaEvento(b.fecha, "Fecha del traslado", periodo.desde);
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      // Bloquear camas en orden estable evita carreras con ingresos y cambios administrativos.
      await tx
        .select()
        .from(camas)
        .where(inArray(camas.id, [ingreso.camaId, camaId]))
        .orderBy(camas.id)
        .for("update");
      const destino = await ubicacion(tx, camaId);
      const [ocupada] = await tx
        .select()
        .from(ocupacionesActivas)
        .where(eq(ocupacionesActivas.camaId, camaId));
      if (destino.estado === "inoperativa" || ocupada)
        throw new HttpError("La cama de destino no está disponible", 409);
      await disponibleDesde(tx, camaId, fecha);
      await tx
        .update(ocupacionesActivas)
        .set({ camaId })
        .where(eq(ocupacionesActivas.ingresoId, id));
      await tx.update(ingresos).set({ camaId }).where(eq(ingresos.id, id));
      await tx
        .update(camas)
        .set({ estado: "libre" })
        .where(eq(camas.id, ingreso.camaId));
      await tx
        .update(camas)
        .set({ estado: "ocupada" })
        .where(eq(camas.id, camaId));
      await tx
        .update(ubicacionesIngreso)
        .set({ hasta: fecha })
        .where(eq(ubicacionesIngreso.id, periodo.id));
      await tx.insert(ubicacionesIngreso).values({
        ingresoId: id,
        camaId,
        servicioId: destino.servicioId,
        servicio: destino.servicio,
        especialidad: destino.especialidad,
        cama: destino.cama,
        desde: fecha,
      });
      await tx.insert(movimientos).values({
        ingresoId: id,
        camaOrigenId: ingreso.camaId,
        camaDestinoId: camaId,
        fecha,
        fechaRegistro: new Date(),
        tipo: "traslado",
        motivo,
        responsable: user.usuario,
        detalle: JSON.stringify({
          origen: periodo.servicio + " / " + periodo.cama,
          destino: destino.servicio + " / " + destino.cama,
        }),
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
