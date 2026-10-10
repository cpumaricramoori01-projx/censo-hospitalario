import { periodoReporte } from "@/lib/hospital";
import { HttpError, identificador } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lt } from "drizzle-orm";
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
    await requireUser();
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const servicioId = searchParams.get("servicioId");
    const tipo = searchParams.get("tipo");

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

    if (servicioId && servicioId !== "todos") {
      if (/^\d+$/.test(servicioId)) {
        filtros.push(eq(ingresos.servicioIngresoId, identificador(servicioId)));
      } else {
        // Compatibilidad con la versión anterior de la pantalla,
        // que enviaba el nombre del servicio en lugar de su ID.
        filtros.push(eq(ingresos.servicioIngreso, servicioId));
      }
    }

    if (tipo === "normal" || tipo === "transferencia") {
      filtros.push(eq(ingresos.tipoIngreso, tipo));
    }

    const rows = await db
      .select({
        id: ingresos.id,
        hc: ingresos.hc,
        nombres: pacientesRef.nombres,
        apellidoPaterno: pacientesRef.apellidoPaterno,
        apellidoMaterno: pacientesRef.apellidoMaterno,
        fechaIngreso: ingresos.fechaIngreso,
        tipoIngreso: ingresos.tipoIngreso,
        financiamiento: ingresos.financiamiento,
        cama: ingresos.camaIngreso,
        ubicacion: camas.ubicacion,
        especialidad: ingresos.especialidadIngreso,
        servicio: ingresos.servicioIngreso,
        medicoId: medicos.id,
        medicoNombres: medicos.nombres,
        medicoApellidoPaterno: medicos.apellidoPaterno,
        medicoApellidoMaterno: medicos.apellidoMaterno,
        medicoRegistrado: ingresos.medico,
        diagnosticoCodigo: diagnosticosIngreso.cie10Codigo,
        diagnostico: diagnosticosIngreso.cie10Descripcion,
        egresoId: egresos.id,
      })
      .from(ingresos)
      .innerJoin(pacientesRef, eq(pacientesRef.hc, ingresos.hc))
      .innerJoin(camas, eq(camas.id, ingresos.camaId))
      .innerJoin(especialidades, eq(especialidades.id, camas.especialidadId))
      .innerJoin(servicios, eq(servicios.id, especialidades.servicioId))
      .leftJoin(medicos, eq(medicos.id, ingresos.medicoId))
      .leftJoin(egresos, eq(egresos.ingresoId, ingresos.id))
      .leftJoin(
        diagnosticosIngreso,
        and(
          eq(diagnosticosIngreso.ingresoId, ingresos.id),
          eq(diagnosticosIngreso.orden, 1),
        ),
      )
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(asc(ingresos.fechaIngreso), asc(ingresos.id));

    const resultado = rows.map((item) => ({
      id: item.id,
      hc: item.hc,
      paciente: [item.nombres, item.apellidoPaterno, item.apellidoMaterno]
        .filter(Boolean)
        .join(" "),
      fechaIngreso: item.fechaIngreso,
      tipoIngreso: item.tipoIngreso,
      financiamiento: item.financiamiento,
      cama: item.cama,
      ubicacion: item.ubicacion,
      especialidad: item.especialidad,
      servicio: item.servicio,
      medico: item.medicoId
        ? [
            item.medicoNombres,
            item.medicoApellidoPaterno,
            item.medicoApellidoMaterno,
          ]
            .filter(Boolean)
            .join(" ")
        : (item.medicoRegistrado ?? ""),
      diagnosticoCodigo: item.diagnosticoCodigo,
      diagnostico: item.diagnostico,
      activo: item.egresoId == null,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    return fallo(error);
  }
}
