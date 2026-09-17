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

    const condicionesCamas = [];
    if (servicioId && servicioId !== "todos") condicionesCamas.push(eq(servicios.id, Number(servicioId)));
    if (especialidadId && especialidadId !== "todos") condicionesCamas.push(eq(especialidades.id, Number(especialidadId)));
    if (estado === "libre" || estado === "inoperativa") condicionesCamas.push(eq(camas.estado, estado));

    const camasRows = await db
      .select({
        id: camas.id,
        numero: camas.numero,
        estadoCama: camas.estado,
        ubicacion: camas.ubicacion,
        especialidadId: especialidades.id,
        especialidad: especialidades.nombre,
        servicioId: servicios.id,
        servicio: servicios.nombre,
      })
      .from(camas)
      .innerJoin(especialidades, eq(camas.especialidadId, especialidades.id))
      .innerJoin(servicios, eq(especialidades.servicioId, servicios.id))
      .where(condicionesCamas.length ? and(...condicionesCamas) : undefined);

    const activos = await db
      .select({
        camaId: ingresos.camaId,
        ingresoId: ingresos.id,
        hc: ingresos.hc,
        fechaIngreso: ingresos.fechaIngreso,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
      })
      .from(ingresos)
      .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
      .innerJoin(pacientesRef, eq(ingresos.hc, pacientesRef.hc))
      .where(isNull(egresos.id));

    const porCama = new Map(activos.map((a) => [a.camaId, a]));
    let resultado = camasRows.map((c) => {
      const activo = porCama.get(c.id);
      const ocupada = Boolean(activo);
      return {
        ...c,
        estado: ocupada ? "ocupada" : c.estadoCama,
        estadoTexto: ocupada ? "Ocupada" : c.estadoCama === "libre" ? "Libre" : "Inoperativa",
        ingresoId: activo?.ingresoId ?? null,
        hc: activo?.hc ?? null,
        fechaIngreso: activo?.fechaIngreso ?? null,
        paciente: activo ? [activo.nombres, activo.apellidoPaterno, activo.apellidoMaterno].filter(Boolean).join(" ") : null,
        diasEstancia: activo ? Math.max(0, Math.floor((Date.now() - new Date(activo.fechaIngreso).getTime()) / 86400000)) : null,
      };
    });

    if (estado === "ocupada") resultado = resultado.filter((c) => c.estado === "ocupada");

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
