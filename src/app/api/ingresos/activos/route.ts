// src/app/api/ingresos/activos/route.ts
// Lista ingresos que AUN NO tienen egreso registrado (pacientes
// actualmente internados). Permite buscar por HC, DNI o nombres/apellidos.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  pacientesRef,
  camas,
  especialidades,
  servicios,
} from "@/db/schema";
import { and, eq, isNull, like, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const hc = request.nextUrl.searchParams.get("hc")?.trim() ?? "";
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    const termino = q.length >= 2 ? `%${q}%` : "";

    const busqueda = q.length >= 2
      ? or(
          like(pacientesRef.hc, termino),
          like(pacientesRef.dni, termino),
          like(pacientesRef.nombres, termino),
          like(pacientesRef.apellidoPaterno, termino),
          like(pacientesRef.apellidoMaterno, termino),
        )
      : hc
        ? eq(ingresos.hc, hc)
        : undefined;

    const condiciones = busqueda
      ? and(isNull(egresos.id), busqueda)
      : isNull(egresos.id);

    const data = await db
      .select({
        ingresoId: ingresos.id,
        hc: ingresos.hc,
        dni: pacientesRef.dni,
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
      .where(condiciones)
      .limit(20);

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}