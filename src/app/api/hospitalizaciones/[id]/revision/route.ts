import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ingresos, pacientesRef } from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import {
  fallo,
  HttpError,
  identificador,
  jsonObject,
  texto,
} from "@/lib/validation";
import { localDay } from "@/lib/census";
import { lockCensus, audit } from "@/lib/census-store";
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireWrite(true);
    const id = identificador((await ctx.params).id);
    const b = await jsonObject(request);
    const financiamiento = texto(b.financiamiento, "Financiamiento", 40);
    const motivo = texto(b.motivo, "Motivo", 2000);
    const birth = texto(b.fechaNacimiento, "Fecha de nacimiento", 10, false);
    let fechaNacimiento: Date | null = null;
    if (birth) {
      fechaNacimiento = new Date(birth + "T00:00:00Z");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
        !Number.isFinite(+fechaNacimiento) ||
        fechaNacimiento.toISOString().slice(0, 10) !== birth
      )
        throw new HttpError("Fecha de nacimiento inválida");
    }
    await db.transaction(async (tx) => {
      await lockCensus(tx);
      const [i] = await tx
        .select()
        .from(ingresos)
        .where(eq(ingresos.id, id))
        .for("update");
      if (!i) throw new HttpError("Hospitalización no encontrada", 404);
      if (birth && birth > localDay(i.fechaIngreso))
        throw new HttpError("El nacimiento no puede ser posterior al ingreso");
      const [p] = await tx
        .select()
        .from(pacientesRef)
        .where(eq(pacientesRef.hc, i.hc))
        .for("update");
      if (!p) throw new HttpError("Paciente no encontrado", 404);
      await tx
        .update(ingresos)
        .set({ financiamiento })
        .where(eq(ingresos.id, id));
      await tx
        .update(pacientesRef)
        .set({ fechaNacimiento, fechaActualizacion: new Date() })
        .where(eq(pacientesRef.hc, i.hc));
      await audit(
        tx,
        user.usuario,
        "hospitalizacion",
        String(id),
        "completar_datos",
        {
          fechaNacimiento: p.fechaNacimiento,
          financiamiento: i.financiamiento,
        },
        { fechaNacimiento, financiamiento },
        motivo,
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
