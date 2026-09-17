import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { camas, especialidades, servicios, ingresos, egresos, pacientesRef } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const servicioId = searchParams.get("servicioId");
    const especialidadId = searchParams.get("especialidadId");
    const estado = searchParams.get("estado");

    const condiciones = [];
    if (servicioId && servicioId !== "todos") condiciones.push(eq(servicios.id, Number(servicioId)));
    if (especialidadId && especialidadId !== "todos") condiciones.push(eq(especialidades.id, Number(especialidadId)));
    if (estado && estado !== "todos") {
      if (estado === "ocupada") condiciones.push(eq(ingresos.id, ingresos.id));
      else condiciones.push(eq(camas.estado, estado));
    }

    const filas = await db
      .select({
        id: camas.id,
        numero: camas.numero,
        estadoCama: camas.estado,
        ubicacion: camas.ubicacion,
        especialidadId: especialidades.id,
        especialidad: especialidades.nombre,
        servicioId: servicios.id,
        servicio: servicios.nombre,
        ingresoId: ingresos.id,
        hc: ingresos.hc,
        fechaIngreso: ingresos.fechaIngreso,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
      })
      .from(camas)
      .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
      .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
      .leftJoin(ingresos, and(eq(ingresos.camaId, camas.id), isNull(egresos.id)))
      .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
      .leftJoin(pacientesRef, eq(ingresos.hc, pacientesRef.hc))
      .where(condiciones.length ? and(...condiciones) : undefined);

    const resultado = filas.map((f) => {
      const ocupada = f.ingresoId !== null;
      return {
        ...f,
        estado: ocupada ? "ocupada" : f.estadoCama,
        estadoTexto: ocupada ? "Ocupada" : f.estadoCama === "libre" ? "Libre" : "Inoperativa",
        paciente: ocupada ? [f.nombres, f.apellidoPaterno, f.apellidoMaterno].filter(Boolean).join(" ") : null,
        diasEstancia: ocupada && f.fechaIngreso ? Math.max(0, Math.floor((Date.now() - new Date(f.fechaIngreso).getTime()) / 86400000)) : null,
      };
    });

    const resumen = {
      total: resultado.length,
      ocupadas: resultado.filter((c) => c.estado === "ocupada").length,
      libres: resultado.filter((c) => c.estado === "libre").length,
      inoperativas: resultado.filter((c) => c.estado === "inoperativa").length,
    };

    return NextResponse.json({ datos: resultado, resumen });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo consultar el reporte de ocupación de camas." }, { status: 500 });
  }
}
