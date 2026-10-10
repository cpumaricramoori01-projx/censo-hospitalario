import { periodoReporte, diasEstancia } from "@/lib/hospital";
import { HttpError, identificador } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  egresos,
  ingresos,
  pacientesRef,
  camas,
  especialidades,
  servicios,
} from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const servicioId = searchParams.get("servicioId");
    const tipo = searchParams.get("tipo");

    const condiciones = [];
    let periodo;
    try {
      periodo = periodoReporte(desde, hasta);
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    if (periodo.inicio)
      condiciones.push(gte(egresos.fechaEgreso, periodo.inicio));
    if (periodo.fin) condiciones.push(lt(egresos.fechaEgreso, periodo.fin));
    if (tipo) condiciones.push(eq(egresos.tipoEgreso, tipo));
    if (servicioId && servicioId !== "todos")
      condiciones.push(eq(egresos.servicioEgresoId, identificador(servicioId)));

    const filas = await db
      .select({
        id: egresos.id,
        ingresoId: egresos.ingresoId,
        hc: ingresos.hc,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
        fechaIngreso: ingresos.fechaIngreso,
        fechaEgreso: egresos.fechaEgreso,
        tipoEgreso: egresos.tipoEgreso,
        servicioDestinoId: egresos.servicioDestinoId,
        medicoAlta: egresos.medicoAlta,
        diagnosticoFinal: egresos.diagnosticoFinal,
        notas: egresos.notas,
        cama: egresos.camaEgreso,
        especialidad: egresos.especialidadEgreso,
        servicioId: egresos.servicioEgresoId,
        servicio: egresos.servicioEgreso,
      })
      .from(egresos)
      .innerJoin(ingresos, eq(egresos.ingresoId, ingresos.id))
      .innerJoin(pacientesRef, eq(ingresos.hc, pacientesRef.hc))
      .innerJoin(camas, eq(ingresos.camaId, camas.id))
      .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
      .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
      .where(condiciones.length ? and(...condiciones) : undefined);

    const resultado = filas.map((f) => ({
      ...f,
      paciente: [f.nombres, f.apellidoPaterno, f.apellidoMaterno]
        .filter(Boolean)
        .join(" "),
      tipoEgresoTexto: f.tipoEgreso.replace(/_/g, " "),
      diasEstancia: diasEstancia(f.fechaIngreso, f.fechaEgreso),
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    return fallo(error);
  }
}
