import { jsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { asc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  pacientesRef,
  medicos,
  diagnosticosIngreso,
  ubicacionesIngreso,
  movimientos,
} from "@/db/schema";
import { requireUser, requireWrite } from "@/lib/auth";
import {
  fallo,
  HttpError,
  identificador,
  texto,
  bandera,
} from "@/lib/validation";
import { ingresoAbierto } from "@/lib/clinical";
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const id = identificador((await ctx.params).id);
    const [ingreso] = await db
      .select()
      .from(ingresos)
      .where(eq(ingresos.id, id));
    if (!ingreso) throw new HttpError("Hospitalización no encontrada", 404);
    const [paciente] = await db
      .select()
      .from(pacientesRef)
      .where(eq(pacientesRef.hc, ingreso.hc));
    const [egreso] = await db
      .select()
      .from(egresos)
      .where(eq(egresos.ingresoId, id));
    const [medico] = ingreso.medicoId
      ? await db.select().from(medicos).where(eq(medicos.id, ingreso.medicoId))
      : [];
    const diagnosticos = await db
      .select()
      .from(diagnosticosIngreso)
      .where(eq(diagnosticosIngreso.ingresoId, id))
      .orderBy(asc(diagnosticosIngreso.orden));
    const ubicaciones = await db
      .select()
      .from(ubicacionesIngreso)
      .where(eq(ubicacionesIngreso.ingresoId, id))
      .orderBy(asc(ubicacionesIngreso.desde), asc(ubicacionesIngreso.id));
    const historial = await db
      .select()
      .from(movimientos)
      .where(eq(movimientos.ingresoId, id))
      .orderBy(asc(movimientos.fecha), asc(movimientos.id));
    return NextResponse.json({
      ingreso,
      paciente,
      egreso: egreso ?? null,
      medico: medico ?? null,
      diagnosticos,
      ubicaciones,
      historial,
      puedeEditar: user.rol !== "consulta",
    });
  } catch (e) {
    return fallo(e);
  }
}
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireWrite();
    const id = identificador((await ctx.params).id);
    const b = await jsonObject(request);
    const medicoId = identificador(b.medicoId, "Médico");
    const notasEstancia = texto(b.notasEstancia, "Notas", 5000, false) || null;
    const flags = {
      usaOxigeno: bandera(b.usaOxigeno),
      usaVentilador: bandera(b.usaVentilador),
      tieneProblemaJudicial: bandera(b.tieneProblemaJudicial),
      tieneProblemaSocial: bandera(b.tieneProblemaSocial),
    };
    if (
      !Array.isArray(b.diagnosticos) ||
      !b.diagnosticos.length ||
      b.diagnosticos.length > 20
    )
      throw new HttpError("Indica entre 1 y 20 diagnósticos");
    if (
      b.diagnosticos.some(
        (d) => !d || typeof d !== "object" || Array.isArray(d),
      )
    )
      throw new HttpError("Diagnóstico inválido");
    const diagnosticos = b.diagnosticos.map(
      (
        d: { cie10Codigo?: unknown; cie10Descripcion?: unknown },
        i: number,
      ) => ({
        ingresoId: id,
        orden: i + 1,
        cie10Codigo: texto(d.cie10Codigo, "Código CIE-10", 15, false) || null,
        cie10Descripcion: texto(d.cie10Descripcion, "Diagnóstico", 250),
      }),
    );
    await db.transaction(async (tx) => {
      const { ingreso } = await ingresoAbierto(tx, id);
      const [doctor] = await tx
        .select()
        .from(medicos)
        .where(and(eq(medicos.id, medicoId), eq(medicos.activo, true)));
      if (!doctor) throw new HttpError("Médico no disponible");
      const anteriores = await tx
        .select()
        .from(diagnosticosIngreso)
        .where(eq(diagnosticosIngreso.ingresoId, id));
      await tx
        .update(ingresos)
        .set({
          ...flags,
          medicoId,
          medico: [
            doctor.nombres,
            doctor.apellidoPaterno,
            doctor.apellidoMaterno,
          ]
            .filter(Boolean)
            .join(" ")
            .slice(0, 100),
          notasEstancia,
        })
        .where(eq(ingresos.id, id));
      await tx
        .delete(diagnosticosIngreso)
        .where(eq(diagnosticosIngreso.ingresoId, id));
      await tx.insert(diagnosticosIngreso).values(diagnosticos);
      await tx.insert(movimientos).values({
        ingresoId: id,
        fecha: new Date(),
        fechaRegistro: new Date(),
        tipo: "actualizacion",
        responsable: user.usuario,
        detalle: JSON.stringify({
          antes: {
            medicoId: ingreso.medicoId,
            usaOxigeno: ingreso.usaOxigeno,
            usaVentilador: ingreso.usaVentilador,
            tieneProblemaJudicial: ingreso.tieneProblemaJudicial,
            tieneProblemaSocial: ingreso.tieneProblemaSocial,
            notasEstancia: ingreso.notasEstancia,
            diagnosticos: anteriores,
          },
          despues: { ...flags, medicoId, notasEstancia, diagnosticos },
        }),
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo(e);
  }
}
