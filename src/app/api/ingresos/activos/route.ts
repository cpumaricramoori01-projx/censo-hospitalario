// src/app/api/ingresos/activos/route.ts
// Lista ingresos que AUN NO tienen egreso registrado (pacientes
// actualmente internados). Uso: GET /api/ingresos/activos?hc=00001234
 
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingresos, egresos, pacientesRef, camas, especialidades, servicios } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
 
export async function GET(request: NextRequest) {
  try {
    const hc = request.nextUrl.searchParams.get("hc");
 
    const condiciones = hc
      ? and(isNull(egresos.id), eq(ingresos.hc, hc))
      : isNull(egresos.id);
 
    const data = await db
      .select({
        ingresoId: ingresos.id,
        hc: ingresos.hc,
        camaId: ingresos.camaId,
        fechaIngreso: ingresos.fechaIngreso,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
        numeroCama: camas.numero,
        especialidadNombre: especialidades.nombre,
        servicioNombre: servicios.nombre,
        servicioId: servicios.id,
      })
      .from(ingresos)
      .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
      .innerJoin(pacientesRef, eq(pacientesRef.hc, ingresos.hc))
      .innerJoin(camas, eq(camas.id, ingresos.camaId))
      .innerJoin(especialidades, eq(especialidades.id, camas.especialidadId))
      .innerJoin(servicios, eq(servicios.id, especialidades.servicioId))
      .where(condiciones);
 
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}