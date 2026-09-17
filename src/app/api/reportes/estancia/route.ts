import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { ingresos, egresos, pacientesRef, camas, especialidades, servicios } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const servicioId = searchParams.get("servicioId");
    const estado = searchParams.get("estado");
    const minimo = Number(searchParams.get("minimo") || "0");

    const filtros = [];
    if (desde) filtros.push(gte(ingresos.fechaIngreso, new Date(`${desde}T00:00:00`)));
    if (hasta) filtros.push(lte(ingresos.fechaIngreso, new Date(`${hasta}T23:59:59.999`)));
    if (servicioId && /^\d+$/.test(servicioId)) filtros.push(eq(servicios.id, Number(servicioId)));
    if (estado === "activa") filtros.push(isNull(egresos.id));
    if (estado === "egresada") filtros.push(eq(egresos.id, egresos.id));

    const rows = await db
      .select({
        ingresoId: ingresos.id,
        hc: ingresos.hc,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
        fechaIngreso: ingresos.fechaIngreso,
        fechaEgreso: egresos.fechaEgreso,
        cama: camas.numero,
        especialidad: especialidades.nombre,
        servicioId: servicios.id,
        servicio: servicios.nombre,
        tipoIngreso: ingresos.tipoIngreso,
        tipoEgreso: egresos.tipoEgreso,
      })
      .from(ingresos)
      .innerJoin(pacientesRef, eq(pacientesRef.hc, ingresos.hc))
      .innerJoin(camas, eq(camas.id, ingresos.camaId))
      .innerJoin(especialidades, eq(especialidades.id, camas.especialidadId))
      .innerJoin(servicios, eq(servicios.id, especialidades.servicioId))
      .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(asc(ingresos.fechaIngreso), asc(ingresos.id));

    const ahora = Date.now();
    const resultado = rows
      .map((f) => {
        const inicio = new Date(f.fechaIngreso).getTime();
        const fin = f.fechaEgreso ? new Date(f.fechaEgreso).getTime() : ahora;
        const diasEstancia = Number.isFinite(inicio) && Number.isFinite(fin) ? Math.max(0, Math.floor((fin - inicio) / 86400000)) : 0;
        const activa = !f.fechaEgreso;
        return {
          ...f,
          paciente: [f.nombres, f.apellidoPaterno, f.apellidoMaterno].filter(Boolean).join(" "),
          estado: activa ? "activa" : "egresada",
          estadoTexto: activa ? "Activa" : "Egresada",
          diasEstancia,
          estanciaProlongada: diasEstancia >= 15,
        };
      })
      .filter((f) => diasEstanciaMinima(f.diasEstancia, minimo));

    const promedio = resultado.length ? resultado.reduce((sum, f) => sum + f.diasEstancia, 0) / resultado.length : 0;
    const resumen = {
      total: resultado.length,
      activas: resultado.filter((f) => f.estado === "activa").length,
      egresadas: resultado.filter((f) => f.estado === "egresada").length,
      prolongadas: resultado.filter((f) => f.estanciaProlongada).length,
      promedio: Number(promedio.toFixed(1)),
    };

    return NextResponse.json({ datos: resultado, resumen });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo consultar el reporte de estancia hospitalaria." }, { status: 500 });
  }
}

function diasEstanciaMinima(dias: number, minimo: number) {
  return !Number.isFinite(minimo) || minimo <= 0 || dias >= minimo;
}
