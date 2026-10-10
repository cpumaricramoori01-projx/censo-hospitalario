import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracionCenso, partesCenso } from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import { fallo, HttpError, jsonObject, texto } from "@/lib/validation";
import { configuration, lockCensus, audit } from "@/lib/census-store";
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(
      await db.transaction(async (tx) => {
        const config = await configuration(tx);
        const rows = await tx
          .select({ id: partesCenso.id })
          .from(partesCenso)
          .limit(1);
        return { ...config, corteBloqueado: Boolean(rows.length) };
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fallo(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireWrite(true);
    const b = await jsonObject(request);
    const horaCorte = texto(b.horaCorte, "Hora de corte", 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaCorte))
      throw new HttpError("Hora inválida");
    const alertaEstancia = Number(b.alertaEstancia);
    if (
      !Number.isInteger(alertaEstancia) ||
      alertaEstancia < 1 ||
      alertaEstancia > 365
    )
      throw new HttpError("Alerta de estancia: entre 1 y 365 días");
    const motivo = texto(b.motivo, "Motivo", 2000);
    await db.transaction(async (tx) => {
      const old = await lockCensus(tx);
      if (old.horaCorte !== horaCorte) {
        const [closed] = await tx
          .select({ id: partesCenso.id })
          .from(partesCenso)
          .limit(1);
        if (closed)
          throw new HttpError(
            "El corte se mantiene fijo tras el primer cierre para preservar la comparabilidad histórica",
            409,
          );
      }
      await tx
        .update(configuracionCenso)
        .set({ horaCorte, alertaEstancia })
        .where(eq(configuracionCenso.id, 1));
      await audit(
        tx,
        user.usuario,
        "configuracion",
        "1",
        "actualizar",
        old,
        { ...old, horaCorte, alertaEstancia },
        motivo,
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
