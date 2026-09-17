import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  pacientesRef,
  camas,
  especialidades,
  servicios,
  medicos,
  diagnosticosIngreso,
} from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const servicioId = searchParams.get("servicioId");
    const tipo = searchParams.get("tipo");

    const filtros = [];

    if (desde) filtros.push(gte(ingresos.fechaIngreso, new Date(`${desde}T00:00:00`)));
    if (hasta) filtros.push(lte(ingresos.fechaIngreso, new Date(`${hasta}T23:59:59`)));
    if (servicioId && /^\d+$/.test(servicioId)) filtros.push(eq(servicios.id, Number(servicioId)));
    if (tipo === "normal" || tipo === "transferencia") filtros.push(eq(ingresos.tipoIngreso, tipo));

    const rows = await db
      .select({
        id: ingresos.id,
        hc: ingresos.hc,
        paciente: sql<string>`concat(${pacientesRef.nombres}, ' ', ${pacientesRef.apellidoPaterno}, ifnull(concat(' ', ${pacientesRef.apellidoMaterno}), ''))`,
        fechaIngreso: ingresos.fechaIngreso,
        tipoIngreso: ingresos.tipoIngreso,
        financiamiento: ingresos.financiamiento,
        cama: camas.numero,
        ubicacion: camas.ubicacion,
        especialidad: especialidades.nombre,
        servicio: servicios.nombre,
        medico: sql<string>`ifnull(concat(${medicos.nombres}, ' ', ${medicos.apellidoPaterno}, ifnull(concat(' ', ${medicos.apellidoMaterno}), '')), ${ingresos.medico}, '')`,
        diagnosticoCodigo: diagnosticosIngreso.cie10Codigo,
        diagnostico: diagnosticosIngreso.cie10Descripcion,
        activo: sql<boolean>`case when ${egresos.id} is null then true else false end`,
      })
      .from(ingresos)
      .innerJoin(pacientesRef, eq(pacientesRef.hc, ingresos.hc))
      .innerJoin(camas, eq(camas.id, ingresos.camaId))
      .innerJoin(especialidades, eq(especialidades.id, camas.especialidadId))
      .innerJoin(servicios, eq(servicios.id, especialidades.servicioId))
      .leftJoin(medicos, eq(medicos.id, ingresos.medicoId))
      .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
      .leftJoin(diagnosticosIngreso, and(eq(diagnosticosIngreso.ingresoId, ingresos.id), eq(diagnosticosIngreso.orden, 1)))
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(asc(ingresos.fechaIngreso), asc(ingresos.id));

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar el reporte de ingresos." },
      { status: 500 },
    );
  }
}
