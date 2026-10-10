import { jsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  egresos,
  camas,
  medicos,
  ocupacionesActivas,
  ubicacionesIngreso,
  movimientos,
  servicios,
} from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import { fallo, HttpError, identificador, texto } from "@/lib/validation";
import { fechaEvento, TIPOS_EGRESO } from "@/lib/hospital";
import { ingresoAbierto, ubicacion } from "@/lib/clinical";
export async function POST(request: Request) {
  try {
    const user = await requireWrite();
    const b = await jsonObject(request);
    const ingresoId = identificador(b.ingresoId);
    if (!TIPOS_EGRESO.some((t) => t === b.tipoEgreso))
      throw new HttpError("Tipo de egreso inválido");
    if (b.tipoEgreso === "transferencia")
      throw new HttpError(
        "Usa Trasladar en la ficha para transferencias internas. El egreso cierra la hospitalización.",
      );
    const medicoId = identificador(b.medicoAltaId, "Médico de alta");
    const diagnosticoFinal = texto(
      b.diagnosticoFinal,
      "Diagnóstico final",
      250,
    );
    const notas = texto(b.notas, "Notas", 5000, false) || null;
    const servicioDestinoId =
      b.tipoEgreso === "transferencia"
        ? identificador(b.servicioDestinoId, "Servicio de destino")
        : null;
    const id = await db.transaction(async (tx) => {
      const { ingreso, periodo } = await ingresoAbierto(tx, ingresoId);
      let fechaEgreso: Date;
      try {
        fechaEgreso = fechaEvento(
          b.fechaEgreso,
          "Fecha de egreso",
          periodo.desde,
        );
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      const [doctor] = await tx
        .select()
        .from(medicos)
        .where(and(eq(medicos.id, medicoId), eq(medicos.activo, true)));
      if (!doctor) throw new HttpError("Médico de alta no disponible");
      if (servicioDestinoId) {
        const [destino] = await tx
          .select()
          .from(servicios)
          .where(eq(servicios.id, servicioDestinoId));
        if (!destino || servicioDestinoId === periodo.servicioId)
          throw new HttpError("Servicio de destino inválido");
        throw new HttpError(
          "Para transferencias internas usa Trasladar en la ficha. El egreso cierra la hospitalización.",
        );
      }
      await ubicacion(tx, ingreso.camaId);
      const result = await tx.insert(egresos).values({
        ingresoId,
        fechaEgreso,
        fechaRegistro: new Date(),
        registradoPor: user.usuario,
        tipoEgreso: String(b.tipoEgreso),
        servicioDestinoId: null,
        medicoAlta: [
          doctor.nombres,
          doctor.apellidoPaterno,
          doctor.apellidoMaterno,
        ]
          .filter(Boolean)
          .join(" ")
          .slice(0, 100),
        diagnosticoFinal,
        notas,
        servicioEgresoId: periodo.servicioId,
        servicioEgreso: periodo.servicio,
        especialidadEgreso: periodo.especialidad,
        camaEgreso: periodo.cama,
      });
      await tx
        .update(ubicacionesIngreso)
        .set({ hasta: fechaEgreso })
        .where(eq(ubicacionesIngreso.id, periodo.id));
      await tx
        .delete(ocupacionesActivas)
        .where(eq(ocupacionesActivas.ingresoId, ingresoId));
      await tx
        .update(camas)
        .set({ estado: "libre" })
        .where(eq(camas.id, ingreso.camaId));
      await tx.insert(movimientos).values({
        ingresoId,
        camaOrigenId: ingreso.camaId,
        fecha: fechaEgreso,
        fechaRegistro: new Date(),
        tipo: "egreso",
        responsable: user.usuario,
        motivo: notas,
        detalle: JSON.stringify({
          tipo: b.tipoEgreso,
          diagnostico: diagnosticoFinal,
        }),
      });
      return result[0].insertId;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return fallo(e);
  }
}
