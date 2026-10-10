import { periodoReporte, diasEstancia } from "@/lib/hospital";
import { HttpError, identificador } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, isNull, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ingresos,
  egresos,
  pacientesRef,
  camas,
  especialidades,
  servicios,
} from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const servicioId = searchParams.get("servicioId");
    const estado = searchParams.get("estado");
    const minimo = Number(searchParams.get("minimo") || "0");

    const filtros = [];
    let periodo;
    try {
      periodo = periodoReporte(desde, hasta);
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    if (periodo.inicio)
      filtros.push(gte(ingresos.fechaIngreso, periodo.inicio));
    if (periodo.fin) filtros.push(lt(ingresos.fechaIngreso, periodo.fin));
    if (servicioId && servicioId !== "todos")
      filtros.push(
        sql`COALESCE(${egresos.servicioEgresoId}, ${servicios.id}) = ${identificador(servicioId)}`,
      );
    if (estado && !["todos", "activa", "egresada"].includes(estado))
      throw new HttpError("Estado inválido");
    if (!Number.isFinite(minimo) || minimo < 0)
      throw new HttpError("Estancia mínima inválida");
    if (estado === "activa") filtros.push(isNull(egresos.id));
    if (estado === "egresada") filtros.push(isNotNull(egresos.id));

    const rows = await db
      .select({
        ingresoId: ingresos.id,
        hc: ingresos.hc,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
        fechaIngreso: ingresos.fechaIngreso,
        fechaEgreso: egresos.fechaEgreso,
        cama: sql<string>`COALESCE(${egresos.camaEgreso}, ${camas.numero})`,
        especialidad: sql<string>`COALESCE(${egresos.especialidadEgreso}, ${especialidades.nombre})`,
        servicioId: sql<number>`COALESCE(${egresos.servicioEgresoId}, ${servicios.id})`,
        servicio: sql<string>`COALESCE(${egresos.servicioEgreso}, ${servicios.nombre})`,
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
        const duracion = diasEstancia(new Date(inicio), new Date(fin));
        const activa = !f.fechaEgreso;
        return {
          ...f,
          paciente: [f.nombres, f.apellidoPaterno, f.apellidoMaterno]
            .filter(Boolean)
            .join(" "),
          estado: activa ? "activa" : "egresada",
          estadoTexto: activa ? "Activa" : "Egresada",
          diasEstancia: duracion,
          estanciaProlongada: duracion >= 15,
        };
      })
      .filter((f) => diasEstanciaMinima(f.diasEstancia, minimo));

    const terminadas = resultado.filter((f) => f.estado === "egresada");
    const activas = resultado.filter((f) => f.estado === "activa");
    const media = (datos: typeof resultado) =>
      datos.length
        ? Number(
            (
              datos.reduce((sum, f) => sum + f.diasEstancia, 0) / datos.length
            ).toFixed(1),
          )
        : 0;
    const promedio = media(terminadas);
    const resumen = {
      total: resultado.length,
      activas: resultado.filter((f) => f.estado === "activa").length,
      egresadas: resultado.filter((f) => f.estado === "egresada").length,
      prolongadas: resultado.filter((f) => f.estanciaProlongada).length,
      promedio,
      promedioEgresadas: promedio,
      promedioActivas: media(activas),
    };

    return NextResponse.json({ datos: resultado, resumen });
  } catch (error) {
    return fallo(error);
  }
}

function diasEstanciaMinima(dias: number, minimo: number) {
  return !Number.isFinite(minimo) || minimo <= 0 || dias >= minimo;
}
