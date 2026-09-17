import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { egresos, ingresos, pacientesRef, camas, especialidades, servicios } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

function finDelDia(fecha: string) {
  return new Date(`${fecha}T23:59:59.999`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const servicioId = searchParams.get("servicioId");
    const tipo = searchParams.get("tipo");

    const condiciones = [];
    if (desde) condiciones.push(gte(egresos.fechaEgreso, new Date(`${desde}T00:00:00`)));
    if (hasta) condiciones.push(lte(egresos.fechaEgreso, finDelDia(hasta)));
    if (tipo) condiciones.push(eq(egresos.tipoEgreso, tipo));
    if (servicioId && servicioId !== "todos") condiciones.push(eq(servicios.id, Number(servicioId)));

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
        cama: camas.numero,
        especialidad: especialidades.nombre,
        servicioId: servicios.id,
        servicio: servicios.nombre,
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
      paciente: [f.nombres, f.apellidoPaterno, f.apellidoMaterno].filter(Boolean).join(" "),
      tipoEgresoTexto: f.tipoEgreso.replace(/_/g, " "),
      diasEstancia: Math.max(0, Math.floor((new Date(f.fechaEgreso).getTime() - new Date(f.fechaIngreso).getTime()) / 86400000)),
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo consultar el reporte de egresos." }, { status: 500 });
  }
}
