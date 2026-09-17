import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, lte, or } from "drizzle-orm";
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

    if (desde) {
      filtros.push(gte(ingresos.fechaIngreso, new Date(`${desde}T00:00:00`)));
    }

    if (hasta) {
      filtros.push(lte(ingresos.fechaIngreso, new Date(`${hasta}T23:59:59`)));
    }

    if (servicioId && servicioId !== "todos") {
      if (/^\d+$/.test(servicioId)) {
        filtros.push(eq(servicios.id, Number(servicioId)));
      } else {
        // Compatibilidad con la versión anterior de la pantalla,
        // que enviaba el nombre del servicio en lugar de su ID.
        filtros.push(eq(servicios.nombre, servicioId));
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
        cama: camas.numero,
        ubicacion: camas.ubicacion,
        especialidad: especialidades.nombre,
        servicio: servicios.nombre,
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
      paciente: [
        item.nombres,
        item.apellidoPaterno,
        item.apellidoMaterno,
      ]
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
        : item.medicoRegistrado ?? "",
      diagnosticoCodigo: item.diagnosticoCodigo,
      diagnostico: item.diagnostico,
      activo: item.egresoId == null,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error obteniendo reporte de ingresos:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo consultar el reporte de ingresos.",
      },
      { status: 500 },
    );
  }
}
